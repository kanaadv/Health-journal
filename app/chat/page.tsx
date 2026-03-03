"use client";

import { useEffect, useRef, useState } from "react";
import { getAllEntries, getGoals } from "../../lib/storage";
import type { DailyEntry, GoalsData } from "../../lib/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hey! I'm up to date on your health journal. Ask me anything — workouts, nutrition, sleep, progress toward your goals, whatever's on your mind.",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [goals, setGoals] = useState<GoalsData | null>(null);
  const [dataReady, setDataReady] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    Promise.all([getAllEntries(), getGoals()]).then(([e, g]) => {
      // Strip workout images before sending to chat context
      const stripped = e.map((entry) => ({
        ...entry,
        evening: { ...entry.evening, workoutImages: undefined },
      }));
      setEntries(stripped);
      setGoals(g);
      setDataReady(true);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    const conversationHistory = [...messages.filter((m) => m.id !== "welcome"), userMsg].map(
      (m) => ({ role: m.role, content: m.content })
    );

    try {
      const abort = new AbortController();
      abortRef.current = abort;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationHistory, entries, goals }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Error: ${errText}` } : m
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snap = accumulated;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: snap } : m))
        );
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Something went wrong. Try again." }
            : m
        )
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-lg">
            🤖
          </div>
          <div>
            <p className="font-semibold text-stone-800 leading-tight">Health Coach</p>
            <p className="text-xs text-stone-500">
              {dataReady
                ? `Up to date on ${entries.length} journal entr${entries.length === 1 ? "y" : "ies"}`
                : "Loading your data..."}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-0.5">
                  🤖
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-white border border-stone-200 text-stone-800 rounded-bl-sm shadow-sm"
                }`}
              >
                {msg.content || (
                  <span className="flex gap-1 items-center text-stone-400">
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-stone-200 bg-white px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your health..."
            disabled={!dataReady}
            className="flex-1 resize-none rounded-2xl border border-stone-300 px-4 py-2.5 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent disabled:opacity-50 overflow-hidden leading-relaxed"
            style={{ height: "42px" }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming || !dataReady}
            className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 translate-x-0.5">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-stone-400 mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
