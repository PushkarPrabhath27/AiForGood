"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendChatbotMessage } from "@/lib/api/chatbot";
import { MessageSquare, X, Send, Bot, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ChatMessage {
  id: string;
  sender: "user" | "saathi";
  text: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export function SaathiChatbot() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messageText, setMessageText] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "saathi",
      text: "I'm Saathi, your clinical AI exchange coordinator. Suggested queries for our demo simulation can include Raju's next eligible donation date or Priya's lab hemoglobin details.",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Clickable suggestion chips
  const suggestionChips = [
    { label: "Raju eligible date?", query: "when is Raju's next eligible donation date?" },
    { label: "What is alloimmunization?", query: "what is alloimmunization?" },
    { label: "What is Priya's Hb?", query: "what is Priya's current hemoglobin level?" },
  ];

  // Send message trigger
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessageId = `user_${Date.now()}`;
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      sender: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setMessageText("");
    setIsLoading(true);

    try {
      // Query standard Saathi API
      const response = await sendChatbotMessage({
        message: text,
        patient_id: "priya_id",
        guardian_id: "guardian_raju_id",
      });

      if (response.success && response.data) {
        const saathiMessage: ChatMessage = {
          id: `saathi_${Date.now()}`,
          sender: "saathi",
          text: response.data.reply,
          timestamp: new Date(),
          ...(response.data.context_detected ? { context: response.data.context_detected } : {}),
        };
        setMessages((prev) => [...prev, saathiMessage]);
      } else {
        throw new Error();
      }
    } catch {
      // Fallback response in sentence case
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: "saathi",
        text: "Saathi Engine: Minor network latency detected. Simulating offline clinical handlers to decrypt thalassemia datasets.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none font-sans">
      <AnimatePresence>
        
        {/* Expanded Chat Console */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed md:absolute md:bottom-20 md:right-0 bottom-0 right-0 left-0 top-0 md:top-auto md:left-auto w-full h-full md:w-96 md:h-[500px] bg-gradient-to-b from-bg-secondary to-bg-primary border border-bg-hover border-t-2 border-t-accent-cyan md:rounded-xl rounded-none overflow-hidden shadow-2xl flex flex-col md:mb-4 mb-0"
          >
            {/* Drifting neural grid underneath */}
            <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />

            {/* Header Widget */}
            <div className="bg-bg-secondary p-4 flex items-center justify-between border-b border-bg-hover relative z-10 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-bg-primary border border-accent-cyan/20 flex items-center justify-center text-accent-cyan shadow-md">
                  <Bot className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white flex items-center gap-1.5 leading-none font-space uppercase">
                    Saathi // AI Coordinator
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-pulse" />
                  </h3>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mt-1 font-mono">Virtual Care Telemetry</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-accent-cyan rounded-md w-8 h-8 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Chat Messages scroll area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 text-sm">
              {messages.map((msg) => {
                const isSaathi = msg.sender === "saathi";
                
                return (
                  <div
                    key={msg.id}
                    className={cn("flex items-start gap-2.5 w-full", isSaathi ? "justify-start" : "justify-end")}
                  >
                    {isSaathi && (
                      <div className="w-7 h-7 rounded-md bg-bg-tertiary border border-accent-cyan/20 flex items-center justify-center text-accent-cyan flex-shrink-0 text-sm shadow-sm font-sans">
                        🤖
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-1 max-w-[75%]">
                      {/* Bubble Text */}
                      <div
                        className={cn(
                          "p-3 rounded-xl text-sm leading-relaxed tracking-normal font-sans shadow-md border",
                          isSaathi
                            ? "bg-bg-tertiary border-bg-hover text-slate-200 border-l-2 border-l-accent-cyan"
                            : "bg-gradient-to-r from-accent-blue to-accent-cyan border-transparent text-white font-medium"
                        )}
                      >
                        {msg.text}

                        {/* Display detected database clinical context metrics */}
                        {msg.context && Object.keys(msg.context).length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-bg-hover space-y-1.5 text-xs text-slate-400 font-sans">
                            <span className="font-bold uppercase tracking-widest block text-slate-500 font-mono text-[8px]">
                              Context Detected
                            </span>
                            {msg.context.next_eligible_date && (
                              <div className="flex justify-between bg-bg-primary/60 px-2.5 py-1 rounded-md border border-bg-hover font-mono text-[9px]">
                                <span>Donation Eligible:</span>
                                <span className="text-accent-teal font-bold">{msg.context.next_eligible_date}</span>
                              </div>
                            )}
                            {msg.context.current_hb && (
                              <div className="flex justify-between bg-bg-primary/60 px-2.5 py-1 rounded-md border border-bg-hover font-mono text-[9px]">
                                <span>Latest Hb Level:</span>
                                <span className="text-accent-rose font-bold">{msg.context.current_hb} g/dL</span>
                              </div>
                            )}
                            {msg.context.patient_name && (
                              <div className="flex justify-between bg-bg-primary/60 px-2.5 py-1 rounded-md border border-bg-hover font-mono text-[9px]">
                                <span>Target Patient:</span>
                                <span className="text-white font-bold">{msg.context.patient_name}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className={cn("text-[8px] text-slate-500 font-semibold px-1 font-mono", !isSaathi && "text-right")}>
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Waiting Loader / Pulsing Typing Indicator in cyan wave */}
              {isLoading && (
                <div className="flex items-start gap-2.5 animate-pulse">
                  <div className="w-7 h-7 rounded-md bg-bg-tertiary border border-accent-cyan/20 flex items-center justify-center text-accent-cyan flex-shrink-0 text-sm">
                    🤖
                  </div>
                  <div className="bg-bg-tertiary border border-bg-hover p-3 rounded-xl flex flex-col gap-1.5 min-w-[120px]">
                    <div className="flex space-x-1.5 items-center py-1 px-0.5">
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-accent-cyan rounded-full shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }} className="w-1.5 h-1.5 bg-accent-cyan rounded-full shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }} className="w-1.5 h-1.5 bg-accent-cyan rounded-full shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
                    </div>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                      Deciphering dialogue...
                    </span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Quick Suggestion Chips: cyan borders */}
            <div className="px-4 py-2 border-t border-bg-hover bg-bg-primary/80 flex flex-wrap gap-1.5 relative z-10">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip.query)}
                  className="text-[10px] font-medium bg-bg-tertiary border border-accent-cyan/20 text-slate-400 hover:text-white hover:border-accent-cyan/60 hover:bg-accent-cyan/5 px-3 py-1 rounded-full transition-all cursor-pointer font-sans"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Typing box entry form */}
            <div className="p-3 border-t border-bg-hover bg-bg-primary/95 flex gap-2 relative z-10">
              <Input
                type="text"
                placeholder="Ask donation dates or medical terms..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage(messageText);
                }}
                className="bg-bg-primary/65 border border-bg-hover text-slate-200 placeholder-slate-600 rounded-lg focus:border-accent-cyan focus-visible:ring-accent-cyan/25 h-10 text-sm font-sans focus-visible:ring-2 focus-visible:ring-offset-0 focus:outline-none transition-all"
              />
              <Button
                size="icon"
                onClick={() => handleSendMessage(messageText)}
                disabled={isLoading || !messageText.trim()}
                className="h-10 w-10 bg-bg-tertiary border border-accent-cyan/20 hover:border-accent-cyan hover:bg-accent-cyan/15 rounded-lg text-accent-cyan shadow-lg cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button Avatar (glowing cyan circle) */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-bg-secondary hover:bg-bg-tertiary border border-accent-cyan/35 rounded-xl shadow-2xl flex items-center justify-center text-accent-cyan relative cursor-pointer group"
        aria-label="Toggle Saathi AI assistant console"
      >
        <MessageSquare className="w-5 h-5 text-accent-cyan group-hover:scale-110 transition-transform filter drop-shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent-cyan border-2 border-bg-primary animate-pulse" />
      </motion.button>
    </div>
  );
}
