import fs from "node:fs";
import path from "node:path";

export type Section = {
  heading: string;
  breadcrumb: string;
  content: string;
};

const BOOK_PATH = path.join(process.cwd(), "data", "libro-rojo.md");
const MIN_SECTION_LENGTH = 200;
const MAX_CONTEXT_CHARS = 9000;
const TOP_SECTIONS = 6;

const STOPWORDS = new Set([
  "de", "la", "el", "en", "y", "a", "los", "las", "un", "una", "unos", "unas",
  "que", "es", "por", "para", "con", "se", "su", "sus", "como", "o", "del",
  "al", "lo", "mas", "pero", "sobre", "sin", "si", "no", "que", "cual",
  "cuales", "donde", "cuando", "este", "esta", "estos", "estas", "ese", "esa",
  "esos", "esas", "hay", "ser", "son", "fue", "muy", "mi", "tu", "le", "les",
  "yo", "nos", "porque", "cuando", "cuyo", "cuya", "entre", "sino", "ya",
]);

let cachedSections: Section[] | null = null;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function cleanHeadingText(text: string): string {
  return text.replace(/\*/g, "").replace(/_/g, "").trim();
}

function parseSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const stack: { level: number; text: string }[] = [];
  const leaves: Section[] = [];

  let buffer: string[] = [];

  function flush() {
    const content = buffer.join("\n").trim();
    if (content.length > 0 && stack.length > 0) {
      leaves.push({
        heading: stack[stack.length - 1].text,
        breadcrumb: stack.map((s) => s.text).join(" > "),
        content,
      });
    }
    buffer = [];
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flush();
      const level = headingMatch[1].length;
      const text = cleanHeadingText(headingMatch[2]);
      while (stack.length && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      stack.push({ level, text });
    } else {
      buffer.push(line);
    }
  }
  flush();

  // Merge sections that are too short to stand alone into the next one,
  // so isolated sentences keep enough surrounding context to be useful.
  const merged: Section[] = [];
  let pending: Section | null = null;
  for (const leaf of leaves) {
    if (pending) {
      merged.push({
        heading: leaf.heading,
        breadcrumb: leaf.breadcrumb,
        content: `${pending.content}\n\n${leaf.content}`,
      });
      pending = null;
    } else if (leaf.content.length < MIN_SECTION_LENGTH) {
      pending = leaf;
    } else {
      merged.push(leaf);
    }
  }
  if (pending) merged.push(pending);

  return merged;
}

function getSections(): Section[] {
  if (cachedSections) return cachedSections;
  const markdown = fs.readFileSync(BOOK_PATH, "utf-8");
  cachedSections = parseSections(markdown);
  return cachedSections;
}

export function searchBook(query: string): { context: string; matches: string[] } {
  const sections = getSections();
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return { context: "", matches: [] };
  }

  const scored = sections.map((section) => {
    const contentNorm = normalize(section.content);
    const breadcrumbNorm = normalize(section.breadcrumb);
    let headingBoost = 0;
    let contentOccurrences = 0;
    for (const token of queryTokens) {
      const wordRegex = new RegExp(`\\b${token}\\w*`, "g");
      contentOccurrences += contentNorm.match(wordRegex)?.length ?? 0;
      if (wordRegex.test(breadcrumbNorm)) headingBoost += 8;
    }
    // Normalize by section length so long sections don't win purely by size.
    const contentScore = (contentOccurrences / Math.sqrt(section.content.length)) * 20;
    return { section, score: headingBoost + contentScore };
  });

  const top = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_SECTIONS);

  let budget = MAX_CONTEXT_CHARS;
  const parts: string[] = [];
  const matches: string[] = [];
  for (const { section } of top) {
    if (budget <= 0) break;
    const block = `### ${section.breadcrumb}\n${section.content}`.slice(0, budget);
    parts.push(block);
    matches.push(section.breadcrumb);
    budget -= block.length;
  }

  return { context: parts.join("\n\n---\n\n"), matches };
}
