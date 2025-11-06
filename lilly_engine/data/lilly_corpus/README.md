# Lilly Classical Corpus

Place here cleaned text excerpts from William Lilly's "Christian Astrology" (public domain), split into manageable TXT files.

Guidelines:

- Encoding: UTF-8
- One topic/chapter per file when possible
- Keep citations: book, chapter, section (include at file start)
- Avoid OCR artifacts; normalize spacing

Example header (inside each .txt file):

```text
Source: Christian Astrology (1647), Book I, Chapter II
Notes: Edited by <your name>, 2025-11-02
```

Then write the body paragraphs. The embedding script will chunk long texts and build `data/embeddings.json`.
