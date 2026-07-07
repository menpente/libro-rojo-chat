import { NextResponse } from "next/server";
import { searchBook } from "@/lib/book";

export const runtime = "nodejs";

const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
const DEFAULT_MODEL = "meta-llama/Llama-3.1-8B-Instruct";
const MAX_HISTORY_MESSAGES = 12;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildSystemPrompt(context: string): string {
  return `Eres un asistente que responde dudas de estilo y ortografía basándote única y exclusivamente en "El libro rojo de Cálamo & Cran", un prontuario de manuales de estilo en español.

Reglas:
- Responde solo con la información de los fragmentos del libro proporcionados a continuación como contexto.
- Si el contexto no contiene la respuesta, dilo claramente en vez de inventar una respuesta.
- Cuando sea útil, cita el apartado del libro del que proviene la información.
- Responde en español, de forma clara y concisa.

Fragmentos del libro relevantes para la pregunta del usuario:
"""
${context || "(No se encontraron fragmentos relevantes para esta pregunta.)"}
"""`;
}

export async function POST(request: Request) {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    return NextResponse.json(
      { error: "Falta configurar la variable de entorno HF_TOKEN en el servidor." },
      { status: 500 }
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "No se recibió ningún mensaje." }, { status: 400 });
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return NextResponse.json({ error: "No se encontró una pregunta del usuario." }, { status: 400 });
  }

  const { context } = searchBook(lastUserMessage.content);
  const recentHistory = messages.slice(-MAX_HISTORY_MESSAGES);

  const model = process.env.HF_MODEL || DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch(HF_ROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildSystemPrompt(context) },
          ...recentHistory,
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar con la API de Hugging Face." },
      { status: 502 }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `Error de la API de Hugging Face (${response.status}): ${errorText}` },
      { status: 502 }
    );
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;

  if (!reply) {
    return NextResponse.json(
      { error: "La API de Hugging Face no devolvió una respuesta válida." },
      { status: 502 }
    );
  }

  return NextResponse.json({ reply });
}
