# Build Plan — PCEP101

**PCEP101 — Python Certification Made Simple.** An interactive, self-study web app for the **PCEP™ – Certified Entry-Level Python Programmer** exam. The main target is **PCEP-30-03**. A switch adds the older **PCEP-30-02** (§3b).
The footer and README say: "Not affiliated with or endorsed by the Python Institute. PCEP is a trademark of the Python Institute."

Authoritative sources (where they disagree with this plan, they win):
- PCEP overview: https://pythoninstitute.org/pcep
- PCEP-30-03 syllabus (blueprint v1.5, revised 2026-11-02): https://pythoninstitute.org/pcep-exam-syllabus
- Free course to link from lessons: Python Essentials 1 on Edube, https://edube.org/study/pe1

- PCEP-30-02 syllabus (still sold until **2027-11-30**): https://pythoninstitute.org/pcep-30-02-exam-syllabus

---

## 1. Decisions so far

| Topic | Decision |
|---|---|
| Name | **PCEP101**, slogan "Python Certification Made Simple". The folder, the repo and the Pages path are all `PCEP101`. |
| Exams | 30-03 is the default; 30-02 is selectable through the exam-track switch (§3b). |
| Audience | Beginners who study on their own on a public site. They may never have programmed before. |
| Language | English |
| Theme | Varied everyday topics (shopping lists, weather, recipes, grades, games, pets…). There's no running storyline and no sports theme. |
| Lessons | Full teaching lessons, one per objective. Python Essentials 1 is linked as an extra resource. |
| Hands-on | Pyodide (CPython in WebAssembly) in the browser: a free **Playground** page plus **auto-graded exercises** for each objective. There's no local Python setup and no `labs/` workspace. |
| Running question code | In practice mode, an item's code can be run or opened in the editor **only after the answer has been checked**. In the mock exam it can never be run. |
| Item types | Single-select, multi-select, gap fill, ordering/drag-and-drop, and code insertion. |
| Bank size | About 310 items (§4). |
| Editor | CodeMirror 6 |
| Deploy | GitHub Pages: `github.com/mhoffmann-wbs/PCEP_prep` → `https://mhoffmann-wbs.github.io/PCEP_prep/` |
| Pyodide | **Self-hosted.** `pyodide` is an npm dependency. A `scripts/setup-pyodide.mjs` that runs before `dev`, `build` and `test` copies the runtime (`pyodide.asm.mjs`, `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json`) into `public/pyodide/`, which is git-ignored. The deploy build ships it to Pages, and Python runs in the learner's browser. Only the stdlib is needed, with no extra packages (about 10 MB). One runtime module with no browser dependencies is shared by the worker and Vitest (Pyodide in Node). |
| Extras | Error explainer and printable cheat sheet with exam-day guide in v1. The step-through visualizer and flashcards with spaced review followed in phase 7. |

## 2. Exam facts the app must mirror (PCEP-30-03)

| Fact | Value | App consequence |
|---|---|---|
| Items | 35 | The mock exam has exactly 35 items, **one per objective**. The syllabus lists 1 item for each of the 35 objectives. |
| Time | 50 min | Countdown, flag for review, review screen. |
| Pass | 70% | A plain percentage, so there's no scaled-score estimate. Every item is scored all-or-nothing. The real exam's partial credit isn't documented, so the result is labelled an estimate. |
| Item types | "Single-select, multiple-select, interactive, and scenario-based" | The schema has a discriminated union of item kinds (§4). Multi-select items state how many answers to pick. |
| Report | Section weights are "blueprint scoring weights and may differ from question-count percentages" | The results show percent correct per section and per objective. |
| Validity | 5 years · retake after 7 days | Shown in the exam-day guide. |

## 3. Blueprint → content map

There are 5 sections and 35 objectives. Objective ids follow the syllabus (`"2.2.3"`). `blueprint.ts` holds each objective's verbatim title and its numbered sub-points, because lessons, questions and exercises link to individual sub-points.

| Section | Weight | Items | Objectives |
|---|---|---|---|
| 1 Computer Programming and Python Fundamentals | 17% | 6 | 1.1.1 language fundamentals (lexis/syntax/semantics, interpreter vs. compiler) · 1.2.1 keywords, statements, indentation, comments · 1.3.1 literals, float accuracy · 1.3.2 variables, identifiers, PEP 8 · 1.4.1 operators, precedence, Boolean expressions · 1.4.2 `print`/`input`, type conversion |
| 2 Control Flow | 23% | 8 | 2.1.1 if / if-else · 2.1.2 if-elif-else · 2.1.3 compound and nested conditions · 2.2.1 `while`, sentinels, infinite loops, walrus `:=` · 2.2.2 `for … in` · 2.2.3 `range()` · 2.2.4 nested loops · 2.2.5 `break`/`continue`/`pass` |
| 3 Data Collections | 26% | 9 | 3.1.1 list construction, indexing, slicing, copying · 3.1.2 list methods, `sorted`, `del`, `in`, `len` · 3.1.3 multidimensional lists · 3.2.1 tuples · 3.3.1 sets · 3.4.1 dictionaries · 3.5.1 string literals, escapes, indexing, slicing · 3.5.2 string methods · 3.5.3 f-strings, `format()`, `%` |
| 4 Functions and Exceptions | 20% | 7 | 4.1.1 `def` and calls · 4.1.2 `return`, `None` · 4.1.3 parameters, positional/keyword arguments, defaults, `sep`/`end` · 4.1.4 `*args`/`**kwargs` · 4.1.5 scope, shadowing, `global` · 4.2.1 built-in exceptions · 4.2.2 `try`/`except` |
| 5 File Handling and Module Imports | 14% | 5 | 5.1.1 text files, modes, `with` · 5.1.2 the `csv` module · 5.2.1 `import` · 5.2.2 `math` (`ceil`, `floor`, `trunc`, `sqrt`) · 5.2.3 `random` (`random`, `seed`, `choice`, `sample`) |

## 3b. PCEP-30-02 track

Learners pick their exam once (on the start page; it can be changed later). The choice is stored in progress and filters everything: blueprint view, lessons list, practice pools, mock exam and readiness.

**Model.** The 30-03 objectives above stay the core. Six **extra objectives** (ids `x.1`–`x.6`) cover what's in 30-02 but not in 30-03:

| Id | Extra objective | 30-02 source |
|---|---|---|
| x.1 | Numeral systems and scientific notation: `0b`/`0o`/`0x` literals, `bin()`/`oct()`/`hex()`, `1e3`, underscores in numbers | 1.3 |
| x.2 | Bitwise operators `~ & ^ \| << >>` and their precedence | 1.4 |
| x.3 | Loop `else`: `while`-`else` and `for`-`else`, and how `break` skips the `else` block | 2.2 |
| x.4 | List comprehensions, including with a condition | 3.1 |
| x.5 | Recursion and basic generators (`yield`) | 4.1 |
| x.6 | The exception hierarchy (`BaseException`, `Exception`, `SystemExit`, `KeyboardInterrupt`, `ArithmeticError`, `LookupError`…), ordering `except` branches, and how exceptions propagate through functions | 4.3, 4.4 |

`blueprint.ts` declares two **exam profiles**, and each one maps its sections onto objectives:
- **30-03**: 5 sections, 35 objectives, 35 items in 50 min.
- **30-02**: 4 blocks (1 = 18%, 7 items · 2 = 29%, 8 · 3 = 25%, 7 · 4 = 28%, 8), 30 items in 40 min, pass mark 70%. A block's pool is the matching 30-03 objectives **plus** the extras from the table above.
- 30-03 objectives with no 30-02 counterpart are tagged `exams: ['30-03']` and left out of the 30-02 track: 2.2.1's walrus sub-point, 3.3.1 sets, 4.1.4 `*args`/`**kwargs`, 3.5.3 f-strings and `format()`, and all of section 5. Where only a sub-point differs, it is tagged instead of the whole objective, and items carry their sub-point tags so the 30-02 sampler can skip them. Check every tag against both syllabi.
- The 30-02 mock exam draws each block's item count from the syllabus (7 · 8 · 7 · 8) across that block's pool, not one item per objective. (The weights are scoring weights; allocating 30 items by weight would give 5 · 9 · 8 · 8, which disagrees with the syllabus.)

**Learner toggles** (in settings, stored in progress, and also shown as checkboxes on the practice and mock-exam start screens):
- **Include 30-02 topics in practice**: when it's on, the `x.*` items join the practice pools (mixed set, least-mastered, weak spots, the matching section or block) and the question bank filter.
- **Include 30-02 topics in the mock exam**:
  - In the **30-03 mock**, an extended mock adds one item per extra objective (35 + 6 = 41 items). The time scales at the real pace (50 min / 35 items, so about 59 min), and the report shows the extras as a separate "30-02 extras" row so they don't distort the 30-03 section results.
  - In the **30-02 mock**, the toggle is always on (the extras are part of that exam), and the checkbox is shown checked and disabled with a note explaining why.
- The defaults follow the chosen track: **off for 30-03**, **on for 30-02**. Switching tracks resets both toggles to the new track's defaults.
- The extra lessons are always reachable from Learn (with the "30-02 only" badge), whatever the toggles say.

Content: 6 extra lessons with the same section structure, 9 questions each (about 54), and 1–2 exercises each. Lessons for the extras carry a "30-02 only" badge.

## 4. Question bank

**Targets.** 9 items per objective in sections 1–4 and 8 in section 5, about **310 items** in total, plus about 54 for the 30-02 extras. That's enough for about 9 mock exams in which no item repeats. Content depth should follow the section weights: 3 (26%) and 2 (23%) are the heaviest.

**Item kinds.** A Zod discriminated union on `kind`. Every kind shares `id`, `objectiveId`, `subpoints[]`, `stem`, optional `code`, `explanation` and a per-option or per-slot rationale.

| `kind` | Interaction | Grading |
|---|---|---|
| `single` | Pick 1 of 4. | exact |
| `multi` | Pick N of 5–6; the stem says "(Select TWO)". | all-or-nothing |
| `gap` | One or more blanks in `code`. Each blank is a free-text input (whitespace-normalised, with a list of accepted answers) or a dropdown. | all blanks correct |
| `order` | Drag the lines of code (or values) into the right order. Keyboard-accessible: up/down buttons. | exact sequence; some items accept more than one order |
| `insert` | `code` contains a `# >>> INSERT <<<` marker. Pick the line that makes the program print the given output. | exact |

**Authoring rules** (enforced by content tests where noted):
- Most items are code-reading items. Item code must be valid, deterministic Python 3. For "What is the output?" items, a **build-time test runs the code in Pyodide and checks that the expected output matches**. The answer key can't drift from real Python behaviour, which is the biggest quality risk for a code exam.
- Anti-giveaway checks: the key-letter balance for `single` items is at most 40%, the key is the longest option at most 40% of the time, there are no duplicate stems, and explanations never mention option letters.
- Every item is written for this app. Nothing is copied from the live exam or from the Python Institute's practice tests.
- Explanations are written for beginners: the correct reasoning step by step, then why each distractor is a tempting mistake.

## 5. Learn: lessons

One MDX lesson per objective, so 35 in total, at `lessons/<objectiveId>.mdx`. The required sections, in order:
1. `## Big idea`: plain-language intro, with no jargon left unexplained.
2. `## Walkthrough`: runnable examples (a `<Runnable>` component opens a small CodeMirror + Pyodide cell).
3. `## Predict the output`: 2–3 quick checks; learners must guess before they can reveal the answer.
4. `## Common mistakes`: beginner errors and the traceback each one produces.
5. `## Exam traps`: what PCEP likes to test about this objective.
6. `## Try it`: a link to this objective's exercise(s).

`meta`: `objectiveId`, `updated`, `tldr`, `subpointsCovered` (a test checks that every syllabus sub-point is covered), plus optional docs.python.org links. Python Essentials 1 links come from the blueprint.

## 6. Do: Pyodide runner, playground, exercises

**Runner** (`src/python/`): one shared Pyodide instance in a **Web Worker**, loaded lazily on the first Run. It's pinned to an exact Pyodide version and self-hosted from `public/pyodide/` (§1).
- stdout/stderr are streamed to an output panel. Tracebacks are trimmed to the learner's own lines.
- **`input()`**: v1 uses a stdin box (input lines entered before running), the way online judges work. Interactive `input()` needs `SharedArrayBuffer`, which needs cross-origin isolation. GitHub Pages can't set COOP/COEP headers, so that would need `coi-serviceworker`, which is a phase-2 spike.
- **Infinite loops**: a timeout (e.g. 5 s) terminates the worker and restarts it. If cross-origin isolation is enabled later, use `setInterruptBuffer` for a clean `KeyboardInterrupt`.
- **Files** (section 5): every run starts with a fresh in-memory FS seeded with the exercise's fixture files (`notes.txt`, `grades.csv`…). The editor can show the files a program wrote.
- `random`: exercises and items that use it call `seed()`, so their output is deterministic.

**Error explainer**: maps the exception type (and common message patterns) to a beginner explanation and a link to lesson 4.2.1. Covers `SyntaxError`, `IndentationError`, `NameError`, `TypeError`, `ValueError`, `IndexError`, `KeyError`, `ZeroDivisionError`, `AttributeError`, `FileNotFoundError` and `UnboundLocalError`.

**Exercises**: `exercises/<objectiveId>.json` (an array per objective, ids `<objectiveId>-e<n>`): prompt, starter code, checks, hints (revealed one at a time) and a solution (shown on request). Checks run in the same worker and the learner sees which ones failed and why:
- `kind: "function"`: Python test code calls the learner's function, e.g. `assert average([2, 4]) == 3`.
- `kind: "io"`: given stdin, compare stdout (normalised).

A test checks that every solution passes its own tests in Pyodide. Target: 1–3 exercises per objective, about 60 in total.

**Playground** (`/playground`): an editor, a stdin box and output. The code is kept in `localStorage`, and a permalink stores it in the URL hash. Opened from a practice item with "Open in editor", it is prefilled with that item's code.

## 7. Architecture

The stack: Vite, React, TS, Tailwind v4, React Router, Zod, MDX, Vitest + RTL and oxlint. It's a static SPA with no backend, deployed to GitHub Pages. Because Pages serves the app under `/PCEP_prep/`, Vite's `base` and the router's `basename` come from `BASE_PATH`. The deploy copies `index.html` to `404.html` so deep links work.

App features:
- a versioned `localStorage` progress store with export/import, which also records exercise results, playground code, the exam track and the 30-02 toggles
- streak-based mastery
- practice by objective, section, weighted mix, least-mastered or weak spots
- a session review after each practice session
- a question bank browser
- keyboard shortcuts
- lazy-loaded pages
- print-ready guides

Tooling:
- content tests
- `content:status` (pool size against target)
- `content:quality` (the anti-giveaway checks)

## 8. Phases

0. **Scaffold** (done 2026-11-20): set up the tooling, the Pyodide setup script and the Pages deploy workflow. Write `blueprint.ts` (both exam profiles, verbatim objectives and sub-points, the extras and the `exams` tags), the schema with all item kinds, and content tests.
1. **Pyodide spike** (done 2026-11-20): the worker runner, timeout, stdin box, virtual FS and error explainer. Then the build-time test that checks item outputs.
2. **Quiz engine** (done 2026-11-20): render and grade all 5 kinds; practice (Run unlocked after Check); mock exam; results by section and objective.
3. **Lessons** (done 2026-11-20, including the 6 extras): 35 lessons, heaviest sections first (3, 2, 4, 1, 5), with `<Runnable>` and predict-the-output blocks.
4. **Question bank** (done 2026-11-20: 364 items, plus the 30-02 mock and the exam-track switch): about 310 core items plus about 54 for the 30-02 extras, written in parallel per objective file. Then the 30-02 mock exam and the exam-track switch.
5. **Exercises and Playground** (done 2026-11-20: 58 exercises, CodeMirror editor, Playground permalinks): about 60 exercises.
6. **Guides and polish** (done 2026-11-20): cheat sheet, exam-day guide, mobile pass, accessibility of ordering items.
7. **Later**: step-through visualizer (done 2026-11-20: `sys.settrace` in Pyodide records line, frames and output for each step, at `/step`), flashcards with spaced review (done 2026-11-20: 212 built-in cards, Leitner boxes, own decks shared as files), and interactive `input()` through cross-origin isolation (done 2026-11-20: shared memory between page and worker, a service worker adds the headers on GitHub Pages). Before phase 7 the blueprint was diffed word for word against the live 30-03 syllabus (v1.5, revised 2026-11-02): no changes.

**After 2027-11-30**: drop the 30-02 profile and extras, or keep them hidden behind a "retired exam" note.
