# El libro rojo de Cálamo & Cran — Chat

Aplicación web de chat para consultar dudas de ortografía y estilo apoyándose en el contenido de *El libro rojo de Cálamo & Cran, Prontuario de manuales de estilo*.

## Cómo funciona

1. El PDF del libro (`el-libro-rojo-de-calamo.pdf`) se convirtió a Markdown (`data/libro-rojo.md`) usando [`pymupdf4llm`](https://pypi.org/project/pymupdf4llm/).
2. Cuando el usuario hace una pregunta, el servidor (`lib/book.ts`) divide el libro en secciones por encabezados y busca las secciones más relevantes mediante coincidencia de palabras clave (sin embeddings ni base de datos externa).
3. Esas secciones se envían como contexto, junto con la pregunta, al modelo **Meta Llama 3.1 8B Instruct** a través de la [Inference API de Hugging Face](https://huggingface.co/docs/inference-providers).
4. La respuesta del modelo se muestra en una interfaz de chat (`app/page.tsx`).

## Requisitos

- Node.js 18+
- Un token de Hugging Face con acceso a la Inference API: https://huggingface.co/settings/tokens

## Configuración

```bash
npm install
cp .env.example .env.local
# Edita .env.local y añade tu HF_TOKEN
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Despliegue en Vercel

1. Importa este repositorio en [Vercel](https://vercel.com/new) (detecta Next.js automáticamente, sin configuración adicional).
2. En **Project Settings → Environment Variables**, añade:
   - `HF_TOKEN`: tu token de Hugging Face.
   - `HF_MODEL` (opcional): por defecto `meta-llama/Llama-3.1-8B-Instruct`.
3. Despliega. Vercel te da una URL pública estable (`tu-proyecto.vercel.app`).

`data/libro-rojo.md` está commiteado en el repo, así que no hace falta regenerar nada durante el despliegue.

## Regenerar el Markdown del libro

Si el PDF cambia, se puede regenerar `data/libro-rojo.md` con:

```bash
pip install pymupdf4llm
python3 scripts/convert_pdf_to_markdown.py
```

## Estructura del proyecto

- `app/page.tsx` — interfaz de chat.
- `app/api/chat/route.ts` — endpoint que recupera contexto del libro y llama a la Inference API de Hugging Face.
- `lib/book.ts` — parseo del Markdown en secciones y búsqueda por palabras clave.
- `data/libro-rojo.md` — contenido del libro en Markdown (generado a partir del PDF).
- `scripts/convert_pdf_to_markdown.py` — script para regenerar el Markdown desde el PDF.
