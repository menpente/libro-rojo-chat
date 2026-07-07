"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const EXAMPLE_QUESTIONS = [
  "¿Cuándo se usa cursiva para los extranjerismos?",
  "¿Las leyes se escriben con mayúscula inicial?",
  "¿Cómo se combinan el punto y las comillas de cierre?",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ha ocurrido un error inesperado.");
      }

      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ha ocurrido un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex flex-1 flex-col bg-calamo-paper font-sans">
      <header className="border-b border-calamo-border bg-calamo-surface px-6 py-5">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-calamo-primary font-serif text-lg font-semibold text-white">
            C
          </span>
          <div>
            <h1 className="font-serif text-2xl font-semibold leading-tight text-calamo-ink">
              El libro rojo de Cálamo &amp; Cran
            </h1>
            <p className="text-sm text-calamo-text-muted">
              Pregunta tus dudas de ortografía y estilo. Las respuestas se basan en el prontuario.
            </p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3 rounded-lg bg-calamo-surface-alt p-6 text-sm text-calamo-text-muted">
            <p className="font-medium text-calamo-ink">Prueba con alguna de estas preguntas:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-md border border-calamo-primary bg-calamo-surface px-3 py-1.5 text-left text-xs font-semibold text-calamo-primary transition-colors hover:bg-calamo-primary hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-[0.95rem] leading-relaxed ${
                message.role === "user"
                  ? "bg-calamo-primary text-white"
                  : "border border-calamo-border bg-calamo-surface text-calamo-text"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg border border-calamo-border bg-calamo-surface px-4 py-2.5 text-sm text-calamo-text-muted">
              Escribiendo…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-calamo-error/40 bg-calamo-error/10 px-4 py-2.5 text-sm text-calamo-error">
            {error}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-calamo-border bg-calamo-surface px-4 py-4">
        <div className="mx-auto flex w-full max-w-3xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu duda de estilo u ortografía…"
            className="flex-1 rounded-md border border-calamo-border bg-white px-3.5 py-3 text-[1rem] text-calamo-text outline-none focus:border-calamo-primary"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || input.trim().length === 0}
            className="rounded-md bg-calamo-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-calamo-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
