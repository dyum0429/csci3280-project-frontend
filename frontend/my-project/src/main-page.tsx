import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VoiceChat() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          stream.getTracks().forEach((track) => track.stop()); 
          await handleSendAudio(audioBlob);
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Error accessing microphone:", error);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Failed to access microphone. Please check permissions." },
        ]);
      }
    }
  };

  const handleSendAudio = async (audioBlob: Blob) => {
    if (!audioBlob) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");

    try {
      const response = await fetch("http://127.0.0.1:5000/api/chat", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.status === "success") {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: data.transcript },
          { role: "assistant", content: data.response_text },
        ]);

        // Play the audio response
        const audioBytes = new Uint8Array(
          data.audio.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16))
        );
        const audioBlob = new Blob([audioBytes], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } else {
        throw new Error(data.message || "Unknown error");
      }
    } catch (error) {
      console.error("Error processing voice request:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendText = async () => {
    if (!transcript.trim()) return;

    const userMessage = transcript.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setTranscript("");
    setIsLoading(true);

    // Optional: Add a text-based endpoint in backend if needed
    try {
      const formData = new FormData();
      const audioBlob = new Blob([userMessage], { type: "text/plain" }); // Dummy audio for consistency
      formData.append("audio", audioBlob, "text.wav");

      const response = await fetch("http://127.0.0.1:5000/api/chat", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.status === "success") {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response_text }]);
        const audioBytes = new Uint8Array(
          data.audio.match(/.{1,2}/g).map((byte : string) => parseInt(byte, 16))
        );
        const audioBlob = new Blob([audioBytes], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } else {
        throw new Error(data.message || "Unknown error");
      }
    } catch (error) {
      console.error("Error generating response:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that request. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
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
            variant={isRecording ? "destructive" : "default"}
            size="icon"
            onClick={toggleRecording}
            disabled={isLoading}
            className={cn(
              "h-20 w-20 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110",
              isRecording
                ? "bg-gradient-to-r from-red-500 to-pink-500"
                : "bg-gradient-to-r from-purple-500 to-blue-500"
            )}
          >
            {isRecording ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
          </Button>
          {isRecording && (
            <div className="absolute -top-2 -right-2 h-6 w-6">
              <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></div>
              <div className="relative inline-flex rounded-full h-6 w-6 bg-pink-500"></div>
            </div>
          )}
        </div>
      </div>

      <div className="py-4 border-t border-purple-500/20">
        <div className="flex items-center w-full gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={isRecording ? "Recording..." : "Type a message or press the microphone to speak"}
              className={cn(
                "p-3 rounded-md border min-h-[60px] w-full bg-transparent backdrop-blur-sm",
                isRecording ? "border-pink-500 bg-slate-800/30" : "border-slate-700 bg-slate-800/20",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
              )}
            />
          </div>

          {transcript && (
            <Button
              size="icon"
              onClick={handleSendText}
              disabled={isLoading || !transcript.trim()}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}