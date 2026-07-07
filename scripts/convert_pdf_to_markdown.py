#!/usr/bin/env python3
"""Regenera data/libro-rojo.md a partir del PDF fuente.

Requiere: pip install pymupdf4llm
Uso: python3 scripts/convert_pdf_to_markdown.py
"""
import pathlib

import pymupdf4llm

ROOT = pathlib.Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "el-libro-rojo-de-calamo.pdf"
OUTPUT_PATH = ROOT / "data" / "libro-rojo.md"


def main() -> None:
    markdown = pymupdf4llm.to_markdown(str(PDF_PATH))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(markdown, encoding="utf-8")
    print(f"Escrito {OUTPUT_PATH} ({len(markdown)} caracteres)")


if __name__ == "__main__":
    main()
