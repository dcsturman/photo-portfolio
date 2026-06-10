# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal photo portfolio website. The owner's own photographs, presented as a
hand-built site hosted on **GitHub Pages**. Plain **HTML** with a small amount of
**JavaScript** where needed — no framework, no build step.

## Working agreement (read this first)

Claude may build the **structure and layout**, but the owner authors all
**creative content**. The line:

- **OK to write/edit:** HTML, CSS, and JavaScript — markup, structure, styling,
  layout, and interactive behavior. Claude can create and edit these files on disk.
- **Do NOT author creative content:** do not write the site's text/copy (prose,
  captions, titles, descriptions, about-text, etc.) and do not create, generate,
  edit, or rename photos or other image assets. Leave that to the owner — use
  placeholders if structure needs filling in.
- Beyond building, Claude also helps with **guidance, proof-reading, and
  layout/design feedback** — visual hierarchy, grid/gallery layouts, accessibility
  and responsive-design advice, and catching typos in the owner's copy.

When in doubt about whether something counts as creative content, ask first.

## Conventions

- Static site, served as-is by GitHub Pages — no compilation, bundler, or package
  manager. Open `index.html` directly in a browser (or a simple local static
  server) to preview.
- Keep dependencies minimal; prefer vanilla HTML/CSS/JS over libraries.
