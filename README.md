# R&D Prep

[![verify](https://github.com/Jerome-Graves/rd-prep/actions/workflows/verify.yml/badge.svg)](https://github.com/Jerome-Graves/rd-prep/actions/workflows/verify.yml)
[![licence: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

**An interactive refresher for R&D and embedded engineering interviews.**
Lessons you read, questions that mark themselves, and code drills that actually compile.

### [Open it here → jerome-graves.github.io/rd-prep](https://jerome-graves.github.io/rd-prep/)

No install, no account, no build step. It is one static HTML page and a folder of
data files. Your progress lives in your own browser and goes nowhere else.

---

## What it is

Preparing for a technical interview usually means reading something, feeling like you
understand it, and then discovering in the room that you cannot actually write it.
This site is built to close that gap. Every topic has three layers:

1. **Read it.** A short lesson with the reasoning, not just the fact.
2. **Prove you know it.** A quiz that explains why the wrong answers are wrong, and
   an open interview question with a model answer to compare against.
3. **Write it.** A code drill in a real editor, compiled by a real compiler, with
   assertions that fail when your answer is wrong.

Practice tests weight toward questions you have not seen or previously got wrong.
The results page ranks your topics weakest first, and every question links straight
back to the lesson that covers it.

## What is in it

| Track | Lessons | Bank questions |
|---|---:|---:|
| Embedded C | 92 | 942 |
| C++ | 16 | 148 |
| DSP | 16 | 164 |
| Acoustics | 16 | 148 |
| Control | 16 | 164 |
| Electronics | 16 | 164 |
| CS & Maths | 16 | 172 |
| Robotics | 16 | 156 |
| RTL & Verilog | 16 | 164 |
| **Total** | **220** | **2222** |

Plus 880 in-lesson quiz questions, 220 open interview questions with model answers,
75 code drills, and a 373-term glossary that tooltips itself into every lesson.

The Embedded C track is deliberately much deeper than the rest. It runs from
`volatile` and integer promotion through Cortex-M exception handling, RTOS design,
DMA coherency, bootloaders and OTA, functional safety, TDD for firmware, and Zephyr.

## The code drills

Three kinds, all in the same editor:

- **Patterns** are the short structures worth having in muscle memory. A ring buffer,
  `container_of`, a wrap-safe timeout comparison, a register field setter.
- **Spot the bug** hands you working-looking code with a real defect in it. You edit
  it in place and the tests tell you whether you found it.
- **Write the code** gives you a specification and an empty editor.

Every drill brief names each parameter, what it is for, what values it can take, and
exactly what the function returns. A bare signature is not a specification.

46 of the 75 drills have a runnable test harness. Your code is compiled by **GCC 13.2
via the Compiler Explorer API** at `-std=c11 -Wall -Wextra -Wshadow -Wconversion -O1`,
linked against a set of assertions, and run. You get the real compiler's diagnostics
and a pass/fail per assertion, not a similarity score.

A few properties cannot be caught at runtime on x86 (`1u << n` versus `1 << n`
produces identical bits at `-O1`, and so does negating `INT32_MIN`). Those drills use
structural checks on your source instead, and the page says so rather than pretending
the test proved something it did not.

## How it is built

Deliberately boring, because it has to still work in two years:

- One `index.html`. No framework, no bundler, no `node_modules`, no build step.
- Content lives in plain `.js` files that push onto global arrays. Adding a lesson is
  adding an object.
- The code editor is about 400 lines of vanilla JS: a transparent `textarea` over a
  syntax-highlighted `<pre>`, with a gutter, error squiggles, bracket matching and
  autocomplete. No CodeMirror, no Monaco.
- Progress, scores and the streak are `localStorage`. There is no server, no account
  and no analytics.

## Quality checks

There is a verifier that loads every script in document order and checks the content,
not the code: duplicate lesson ids, bank topics that resolve to no lesson, malformed
questions, broken glossary links, and unescaped markup in lesson bodies.

It also audits **answer-length bias**. If the correct option in a multiple-choice
question is reliably the longest one, the bank is answerable without knowing anything.
The Embedded C bank measured 87% against a 25% chance level, so all 895 questions in
it were rewritten: reasoning moved out of the correct option and into the explanation,
and every throwaway distractor replaced with a plausible misconception at a comparable
length. It now measures 25%. The other tracks are still to do, and the verifier
reports them on every run.

## Adding content

```js
LESSONS.push({
    id: "emb-volatile", track: "Embedded C", sub: "The C language",
    title: "volatile and what it does not promise", mins: 9,
    body: "<p>...</p>",
    quiz: [{ q: "...", o: ["...", "...", "...", "..."], a: 1, why: "<p>...</p>" }],
    interview: { q: "...", a: "<p>...</p>" }
});
```

Drop the file in, add one `<script src>` line to `index.html`, and it appears in the
navigation. Bank questions, drills and glossary terms follow the same shape.

## Licence

MIT. See [LICENSE](LICENSE).
