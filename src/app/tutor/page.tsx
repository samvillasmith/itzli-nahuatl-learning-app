"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How do I say \"my name is...\" in Nahuatl?",
  "Explain the verb prefixes ni-, ti-, etc.",
  "What's the difference between -tl and -tli?",
  "How do I form the past tense?",
  "Teach me the Nahuatl numbers 1-10",
  "How do possessives work? (my, your, his)",
];

export default function TutorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages }),
        });

        if (!res.ok) {
          throw new Error(
            res.status === 401
              ? "Unauthorized — please sign in."
              : `Error ${res.status}: ${res.statusText}`
          );
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let assistantText = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantText,
            };
            return updated;
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [messages, isLoading]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)]">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-bold text-stone-900">
            Tlamachtihquetl
            <span className="text-stone-400 font-normal text-sm ml-2">
              Nahuatl Tutor
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Ask about grammar, vocabulary, pronunciation, or culture.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl mx-auto mb-4">
                🦅
              </div>
              <h2 className="text-xl font-bold text-stone-800 mb-2">
                Pialli! Hello!
              </h2>
              <p className="text-stone-500 text-sm max-w-md mx-auto mb-8">
                I&apos;m your Nahuatl language tutor. Ask me anything about
                Eastern Huasteca Nahuatl — grammar, vocabulary, how to say
                something, or how the language works.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 text-xs bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 text-stone-600 rounded-full transition-colors border border-stone-200 hover:border-emerald-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-emerald-500 text-white rounded-br-md"
                    : "bg-stone-100 text-stone-800 rounded-bl-md"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="text-[10px] font-bold text-emerald-600 mb-1 uppercase tracking-wider">
                    Tlamachtihquetl
                  </div>
                )}
                {m.content || (isLoading && i === messages.length - 1 ? "" : "")}
              </div>
            </div>
          ))}

          {isLoading &&
            (messages.length === 0 ||
              messages[messages.length - 1]?.role === "user") && (
              <div className="flex justify-start">
                <div className="bg-stone-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    />
                    <span
                      className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    />
                  </div>
                </div>
              </div>
            )}

          {error && (
            <div className="text-center text-sm text-red-500 bg-red-50 rounded-xl p-3">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-stone-200 bg-white px-4 py-3 shrink-0">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Nahuatl grammar, vocabulary, culture..."
            className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-shadow"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-300 text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
