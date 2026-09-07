---
name: compile-whitepaper
description: Compile the institutional whitepaper from docs/whitepaper/ to PDF using Typst. Use when the user asks to build the whitepaper, compile the PDF, or generate the report.
---

# Compile the whitepaper

Compile the Typst whitepaper in `docs/whitepaper/` to PDF.

## Steps

1. Check Typst is installed:
   ```bash
   typst --version
   ```
   If not installed, tell the user to install it
   (`brew install typst` on macOS) and stop.

2. Compile:
   ```bash
   cd docs/whitepaper
   typst compile main.typ NUSSIF_Infrastructure_Projects_Whitepaper.pdf
   ```

3. Report the output path and file size. If compilation fails, show the
   Typst error and suggest fixing the offending `sections/*.md` file.

## Notes

- The whitepaper `#include`s markdown section files via Typst's markdown
  support. If a section uses syntax Typst can't render, isolate it and
  report the line.
- Do not edit the whitepaper content unless the user asks; this skill
  only compiles.
