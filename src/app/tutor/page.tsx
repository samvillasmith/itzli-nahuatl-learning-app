"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Mode = "tutor" | "practice";

const TUTOR_SUGGESTIONS = [
  "How do I say \"my name is...\" in Nahuatl?",
  "Explain the verb prefixes ni-, ti-, etc.",
  "What's the difference between -tl and -tli?",
  "How do I form the past tense?",
  "Teach me the Nahuatl numbers 1-10",
  "How do possessives work? (my, your, his)",
];

const PRACTICE_SUGGESTIONS = [
  "Pialli! (Hello!)",
  "Notoca Sam. (My name is Sam.)",
  "¿Quenin tiitztoc? (How are you?)",
  "¿Tlen motoca? (What's your name?)",
];

const MODE_META: Record<Mode, { title: string; subtitle: string; placeholder: string; emptyHeadline: string; emptyBody: string }> = {
  tutor: {
    title: "Nahuatl Tutor",
    subtitle: "Ask about grammar, vocabulary, pronunciation, or culture.",
    placeholder: "Ask about Nahuatl grammar, vocabulary, culture...",
    emptyHeadline: "Pialli! Hello!",
    emptyBody:
      "I'm your Nahuatl language tutor. Ask me anything about Eastern Huasteca Nahuatl — grammar, vocabulary, how to say something, or how the language works.",
  },
  practice: {
    title: "Conversation Practice",
    subtitle: "Practice speaking Nahuatl in a real conversation.",
    placeholder: "Write in Nahuatl (or English to get help)...",
    emptyHeadline: "Pialli! Let's talk.",
    emptyBody:
      "I'll respond in Nahuatl with an English translation. Try greeting me in Nahuatl — or click a starter below. Don't worry about perfect spelling; I'll understand common variants.",
  },
};

export default function TutorPage() {
  const [mode, setMode] = useState<Mode>("tutor");
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

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setMessages([]);
    setInput("");
    setError(null);
  }

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
          body: JSON.stringify({ messages: newMessages, mode }),
        });

        if (!res.ok) {
          let msg: string;
          if (res.status === 401) msg = "Unauthorized — please sign in.";
          else if (res.status === 429) msg = "Too many messages. Please wait a moment.";
          else if (res.status === 413) msg = "That message is too long. Please shorten it.";
          else msg = `Error ${res.status}: ${res.statusText}`;
          throw new Error(msg);
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
    [messages, isLoading, mode],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const meta = MODE_META[mode];
  const suggestions = mode === "tutor" ? TUTOR_SUGGESTIONS : PRACTICE_SUGGESTIONS;

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)]">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-stone-900 truncate">
              Tlamachtihquetl
              <span className="text-stone-400 font-normal text-sm ml-2">
                {meta.title}
              </span>
            </h1>
            <p className="text-xs text-stone-400 mt-0.5 truncate">
              {meta.subtitle}
            </p>
          </div>
          {/* Mode toggle */}
          <div className="inline-flex p-0.5 bg-stone-100 rounded-full text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => switchMode("tutor")}
              className={`px-3 py-1 rounded-full transition-colors ${
                mode === "tutor"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
              aria-pressed={mode === "tutor"}
            >
              Tutor
            </button>
            <button
              type="button"
              onClick={() => switchMode("practice")}
              className={`px-3 py-1 rounded-full transition-colors ${
                mode === "practice"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
              aria-pressed={mode === "practice"}
            >
              Practice
            </button>
          </div>
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
                {mode === "practice" ? "🗣️" : "🦅"}
              </div>
              <h2 className="text-xl font-bold text-stone-800 mb-2">
                {meta.emptyHeadline}
              </h2>
              <p className="text-stone-500 text-sm max-w-md mx-auto mb-8">
                {meta.emptyBody}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
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
            placeholder={meta.placeholder}
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
