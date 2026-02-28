"use client";

// ── Chatbot page ──────────────────────────────────────────────────────────────
// An AI agent that knows the context of all subjects available in LearnReel.
// UI: chat bubbles, context-aware suggestions, full-screen on mobile.

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

// ── Stub responses (replace with real LLM call) ───────────────────────────────
const SUBJECT_CONTEXT = [
  "Operating Systems (processes, scheduling, deadlock, memory management)",
  "Data Structures (hash tables, trees, graphs, sorting algorithms)",
  "Computer Networks (TCP/IP, routing, DNS, HTTP)",
  "Algorithms & Complexity (Big-O, divide & conquer, dynamic programming)",
  "Databases (SQL, normalization, indexing, transactions)",
  "Machine Learning (supervised learning, neural networks, evaluation metrics)",
];

function generateStubReply(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes("deadlock")) {
    return "Deadlock occurs when four conditions hold simultaneously: **Mutual Exclusion**, **Hold & Wait**, **No Preemption**, and **Circular Wait**. Breaking any one of these prevents deadlock. The Banker's Algorithm is a classic avoidance strategy — want me to walk you through it?";
  }
  if (msg.includes("hash") || msg.includes("hash table")) {
    return "A hash table maps keys to values using a hash function. Average lookup is O(1), but collisions degrade performance. Two main strategies: **chaining** (linked lists per bucket) and **open addressing** (linear/quadratic probing). Keep load factor below 0.7 for best performance.";
  }
  if (msg.includes("tcp") || msg.includes("network")) {
    return "TCP is a reliable, connection-oriented protocol. It uses a **3-way handshake** (SYN → SYN-ACK → ACK) to establish connections, and guarantees delivery via acknowledgements and retransmission. UDP skips all of this for raw speed — think video streaming.";
  }
  if (msg.includes("big-o") || msg.includes("complexity") || msg.includes("algorithm")) {
    return "Big-O notation describes the **worst-case** growth of an algorithm. Common complexities: O(1) constant, O(log n) binary search, O(n) linear scan, O(n log n) merge sort, O(n²) bubble sort. Always aim for the best complexity your problem allows.";
  }
  if (msg.includes("sql") || msg.includes("database") || msg.includes("db")) {
    return "SQL databases use **ACID** properties (Atomicity, Consistency, Isolation, Durability) for reliable transactions. Indexing speeds up SELECT queries but slows down writes. Normalization (1NF → 3NF) removes redundancy — denormalization trades storage for read speed.";
  }
  if (msg.includes("neural") || msg.includes("ml") || msg.includes("machine learning")) {
    return "Neural networks learn by adjusting weights via **backpropagation** — computing the gradient of the loss with respect to each weight. Key hyperparameters: learning rate, batch size, number of layers, activation functions. Overfitting? Try dropout or L2 regularisation.";
  }
  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    return "Hey! I'm your LearnReel AI assistant. I know everything in your reel library — Operating Systems, Data Structures, Networks, Algorithms, Databases, and Machine Learning. Ask me anything!";
  }
  if (msg.includes("what can you") || msg.includes("help")) {
    return `I can help you with any topic from your subjects:\n\n${SUBJECT_CONTEXT.map((s) => `• ${s}`).join("\n")}\n\nJust ask a question or say "explain [concept]"!`;
  }

  return `Great question! I'm covering all subjects in your reel library:\n\n${SUBJECT_CONTEXT.map((s) => `• ${s}`).join("\n")}\n\nCould you be more specific? For example: "Explain deadlock" or "What is Big-O complexity?"`;
}

// ── Suggestion chips ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "Explain deadlock 🔒",
  "What is Big-O? ⚡",
  "How does TCP work? 🌐",
  "Hash tables vs arrays 🗂️",
  "What is backpropagation? 🤖",
  "SQL vs NoSQL? 🗄️",
];

// ── Sub-components ────────────────────────────────────────────────────────────
function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-brand-accent flex items-center justify-center text-sm mr-2 flex-shrink-0 self-end mb-1">
          🤖
        </div>
      )}
      <div
        className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-brand-accent text-white rounded-br-md"
            : "bg-brand-card text-white/90 rounded-bl-md border border-white/5"
        }`}
        // Render **bold** markdown simply
        dangerouslySetInnerHTML={{
          __html: message.text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br/>"),
        }}
      />
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const INITIAL_MESSAGE: Message = {
  id: "init",
  role: "assistant",
  text: "Hey! 👋 I'm your LearnReel AI assistant.\n\nI have full context on all your subjects — ask me anything about Operating Systems, Data Structures, Networks, Algorithms, Databases, or Machine Learning!",
  timestamp: new Date(),
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking delay
    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      const reply = generateStubReply(trimmed);
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, delay);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <main className="relative w-full h-full bg-brand-bg flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-3 flex-shrink-0 border-b border-white/5 bg-brand-bg/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center text-lg glow-purple">
            🤖
          </div>
          <div>
            <h1 className="text-base font-bold text-white">AI Study Assistant</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
              <p className="text-[11px] text-brand-muted">
                Knows all your subjects
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 mb-3"
            >
              <div className="w-8 h-8 rounded-xl bg-brand-accent flex items-center justify-center text-sm mr-2 flex-shrink-0">
                🤖
              </div>
              <div className="bg-brand-card border border-white/5 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-brand-muted"
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Suggestion chips ── */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="flex-shrink-0 px-3 py-2 rounded-xl bg-brand-card border border-white/10 text-[11px] text-white/80 font-medium active:scale-95 transition-transform"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="px-4 pb-24 pt-2 flex-shrink-0 border-t border-white/5 bg-brand-bg/80 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your subjects..."
            className="flex-1 bg-brand-card border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-brand-muted outline-none focus:border-brand-accent/60 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-11 h-11 rounded-2xl bg-brand-accent flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="white"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </div>

      <BottomNav />
    </main>
  );
}
