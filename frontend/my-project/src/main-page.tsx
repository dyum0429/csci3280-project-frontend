import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import toWav from "audiobuffer-to-wav";

export default function VoiceChat() {
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "recording" | "processing">(
    "idle"
  );
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<ReturnType<typeof recordAudio> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const recordAudio = () => {
    let mediaRecorder: MediaRecorder;
    let audioChunks: Blob[] = [];

    return {
      start: async (): Promise<boolean> => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        return new Promise((resolve) => {
          audioChunks = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
          };

          mediaRecorder.onstart = () => resolve(true);

          mediaRecorder.start();
        });
      },

      stop: (): Promise<Blob> =>
        new Promise((resolve) => {
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            resolve(audioBlob);
          };
          mediaRecorder.stop();
        }),
    };
  };

  const playAudioResponse = (audioHex: string) => {
    try {
      // Convert hex string to ArrayBuffer
      const buffer = new Uint8Array(audioHex.length / 2);
      for (let i = 0; i < audioHex.length; i += 2) {
        buffer[i/2] = parseInt(audioHex.substr(i, 2), 16);
      }

      const audioBlob = new Blob([buffer], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Clean up previous audio if exists
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.play().catch((err) => {
        setPlaybackError("Audio playback blocked. Click to play response.");
        console.warn("Autoplay blocked:", err);
      });
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setPlaybackError(null);
      };

      console.log("Decoded buffer length:", buffer.length);
      
    } catch (e) {
      console.error("Audio playback failed:", e);
      setPlaybackError("Failed to play audio response");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendAudio = async (audioBlob: Blob) => {
    if (!audioBlob || audioBlob.size === 0) {
      console.error("Audio blob is empty or invalid");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "No audio recorded. Please try again.",
        },
      ]);
      setIsLoading(false);
      setStatus("idle");
      return;
    }

    setIsLoading(true);
    setStatus("processing");

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");

      const response = await fetch("http://127.0.0.1:5000/api/chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "success") {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: data.transcript },
          { role: "assistant", content: data.response_text },
        ]);

        if (data.audio) {
          playAudioResponse(data.audio);
        }
      } else {
        throw new Error(data.message || "Unknown error");
      }
    } catch (error) {
      console.error("Error processing voice request:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: Could not process audio. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setStatus("idle");
    }
  };

  const toggleRecording = async () => {
    if (!recorderRef.current) {
      recorderRef.current = recordAudio();
    }

    const recorder = recorderRef.current;

    try {
      if (status === "recording") {
        setStatus("processing");

        const webmBlob = await recorder.stop();
        const audioContext = new AudioContext();
        const arrayBuffer = await webmBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const wavBuffer = toWav(audioBuffer);
        const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

        await handleSendAudio(wavBlob);
      } else {
        const started = await recorder.start();
        if (started) setStatus("recording");
      }
    } catch (error) {
      console.error("Recording error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't record audio. Please try again.",
        },
      ]);
      setStatus("idle");
    }
  };

  return (
    <div className="container-fluid h-100 p-4 h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900/40 to-slate-900 text-white dark">
      <div className="py-6">
        <h1 className="text-center text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-500 text-transparent bg-clip-text">
          Voice AI Chat
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 px-2">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Press the microphone button below to start speaking
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg max-w-[80%] shadow-lg",
                  message.role === "user"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white ml-auto"
                    : "bg-gradient-to-r from-slate-700 to-slate-800 text-white mr-auto"
                )}
              >
                {message.content}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex justify-center items-center py-12">
        <div className="relative">
          <Button
            variant={status === "recording" ? "destructive" : "default"}
            size="icon"
            onClick={toggleRecording}
            disabled={isLoading || status === "processing"}
            className={cn(
              "h-20 w-20 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110",
              status === "recording"
                ? "bg-gradient-to-r from-red-500 to-pink-500"
                : "bg-gradient-to-r from-purple-500 to-blue-500"
            )}
          >
            <Mic className="h-10 w-10" />
          </Button>
          {status === "recording" && (
            <div className="absolute -top-2 -right-2 h-6 w-6">
              <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></div>
              <div className="relative inline-flex rounded-full h-6 w-6 bg-pink-500"></div>
            </div>
          )}
        </div>
      </div>

      {playbackError && (
        <div className="text-center text-pink-400 mb-2">
          <button 
            onClick={() => audioRef.current?.play()}
            className="underline"
          >
            {playbackError}
          </button>
        </div>
      )}

      <div className="py-4 border-t border-purple-500/20">
        <div className="flex items-center w-full gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={transcript}
              readOnly
              placeholder={
                status === "recording"
                  ? "Recording..."
                  : status === "processing"
                  ? "Processing..."
                  : "Press the microphone to speak"
              }
              className={cn(
                "p-3 rounded-md border min-h-[60px] w-full bg-transparent backdrop-blur-sm",
                status === "recording"
                  ? "border-pink-500 bg-slate-800/30"
                  : "border-slate-700 bg-slate-800/20",
                "focus:outline-none text-white"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}