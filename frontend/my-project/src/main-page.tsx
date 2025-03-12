"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
//import { generateText } from "ai"
//import { openai } from "@ai-sdk/openai"

// Declare SpeechRecognition
declare var SpeechRecognition: any
declare var webkitSpeechRecognition: any

export default function VoiceChat() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  //const recognitionRef = useRef<SpeechRecognition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

//   useEffect(() => {
//     // Scroll to bottom whenever messages change
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   useEffect(() => {
//     // Initialize speech recognition
//     if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
//       const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition
//       recognitionRef.current = new SpeechRecognition()
//       recognitionRef.current.continuous = true
//       recognitionRef.current.interimResults = true

//       recognitionRef.current.onresult = (event) => {
//         const transcript = Array.from(event.results)
//           .map((result) => result[0])
//           .map((result) => result.transcript)
//           .join("")

//         setTranscript(transcript)
//       }

//       recognitionRef.current.onerror = (event) => {
//         console.error("Speech recognition error", event.error)
//         setIsListening(false)
//       }
//     }
//   }, [])

//   const toggleListening = () => {
//     if (isListening) {
//       recognitionRef.current?.stop()
//       setIsListening(false)
//       if (transcript.trim()) {
//         handleSendMessage()
//       }
//     } else {
//       setTranscript("")
//       recognitionRef.current?.start()
//       setIsListening(true)
//     }
//   }

//   const handleSendMessage = async () => {
//     if (!transcript.trim()) return

//     const userMessage = transcript.trim()
//     setMessages((prev) => [...prev, { role: "user", content: userMessage }])
//     setTranscript("")
//     setIsLoading(true)

//     try {
//       const { text } = await generateText({
//         model: openai("gpt-4o"),
//         prompt: userMessage,
//         system: "You are a helpful assistant responding to voice messages. Keep responses concise and conversational.",
//       })

//       setMessages((prev) => [...prev, { role: "assistant", content: text }])

//       // Read the response aloud
//       if ("speechSynthesis" in window) {
//         const speech = new SpeechSynthesisUtterance(text)
//         window.speechSynthesis.speak(speech)
//       }
//     } catch (error) {
//       console.error("Error generating response:", error)
//       setMessages((prev) => [
//         ...prev,
//         {
//           role: "assistant",
//           content: "Sorry, I couldn't process that request. Please try again.",
//         },
//       ])
//     } finally {
//       setIsLoading(false)
//     }
//   }

  return (
    <div className="container-fluid h-100 p-4 h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900/40 to-slate-900 text-white dark">
      {/* Header */}
      <div className="py-6">
        <h1 className="text-center text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-500 text-transparent bg-clip-text">
          Voice AI Chat
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pb-4 px-2">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Press the microphone button below and start speaking
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg max-w-[80%] shadow-lg",
                  message.role === "user"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white ml-auto"
                    : "bg-gradient-to-r from-slate-700 to-slate-800 text-white mr-auto",
                )}
              >
                {message.content}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Center microphone section */}
      <div className="flex justify-center items-center py-12">
        <div className="relative">
          <Button
            variant={isListening ? "destructive" : "default"}
            size="icon"
            //onClick={toggleListening}
            disabled={isLoading}
            className={cn(
              "h-20 w-20 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110",
              isListening
                ? "bg-gradient-to-r from-red-500 to-pink-500"
                : "bg-gradient-to-r from-purple-500 to-blue-500",
            )}
          >
            {isListening ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
          </Button>
          {isListening && (
            <div className="absolute -top-2 -right-2 h-6 w-6">
              <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></div>
              <div className="relative inline-flex rounded-full h-6 w-6 bg-pink-500"></div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="py-4 border-t border-purple-500/20">
        <div className="flex items-center w-full gap-2">
          <div className="relative flex-1">
            <div
              className={cn(
                "p-3 rounded-md border min-h-[60px] flex items-center backdrop-blur-sm",
                isListening ? "border-pink-500 bg-slate-800/30" : "border-slate-700 bg-slate-800/20",
              )}
            >
              {transcript || (isListening ? "Listening..." : "Press the microphone to speak")}
            </div>
          </div>

          {transcript && (
            <Button
              size="icon"
              //onClick={handleSendMessage}
              disabled={isLoading || !transcript.trim()}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

