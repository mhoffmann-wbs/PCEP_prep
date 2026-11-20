# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Phases 0–4 are done: scaffold, Pyodide runner, quiz engine, lessons (35 objectives + 6 extras), and the question bank (364 items: 9 per objective, 8 in section 5) with the 30-02 mock and the exam-track switch. Next is phase 5 (exercises and Playground). The bank holds a first 12 items; phase 4 fills it. **`PLAN.md` is the build plan and sets the order of work**: it records the decisions made, the content map, the item kinds and the phases. As parts get built, replace the plan-level notes below with what actually exists (commands, file layout, gotchas).

## Commands

- `npm run dev` / `npm run build` / `npm test`: each first runs `scripts/setup-pyodide.mjs`, which copies the pinned `pyodide` package (exact version in `package.json`) into `public/pyodide/`.
- `npm run lint` (oxlint, config in `.oxlintrc.json`), `npm run typecheck`.
- Run one test file: `npx vitest run src/content/schema.test.ts`. Tests run in Node by default; component tests start with `// @vitest-environment jsdom`. Tests that need Python use `getPyodide()` / `getPyodidePair()` from `src/test/pyodide.ts` (real Pyodide in Node, about 1 s to load).
- `BASE_PATH=/PCEP_prep/ npm run build` builds for Pages. `.github/workflows/deploy.yml` lints, tests, builds, copies `index.html` to `404.html` and deploys on push to `main`.

## Layout

- `src/content/blueprint.ts`: both exam profiles, the 35 core objectives (titles and sub-points verbatim from the 30-03 syllabus), the extras `x.1`–`x.6`, `exams` tags and helpers (`subpointInExam`, `mockShape`). Sub-point ids are `<objectiveId>.<n>`, e.g. `2.2.1.5`.
- `src/content/schema.ts`: Zod item schema (`single`, `multi`, `gap`, `order`, `insert`). Item ids are `<objectiveId>-NN`. Gap blanks are `__BLANK1__`, `__BLANK2__`… in `code`. `output`/`raises` hold what the complete program prints or raises; `completeProgram()` builds that program with the answer filled in, for the Pyodide output check (phase 1).
- `src/content/questions/<objectiveId>.json`: a JSON array of items per objective, loaded by `src/content/bank.ts` (`ITEMS`, `itemInExam`).
- `src/content/quality.ts`: the anti-giveaway checks, run over the real bank by `bank.test.ts`. `npm run content:status` prints items per objective against `questionTarget()` with the kind mix; `npm run content:quality` prints the key-letter spread and runs the checks.
- `src/content/features.ts`: detects Python features only one exam teaches (30-03: walrus, f-strings, `format()`, sets, `*args`/`**kwargs`, files, `csv`/`math`/`random`; 30-02: bitwise, loop `else`, comprehensions, generators, recursion, `0b`/`0o`/`0x`, scientific notation). `bank.test.ts` fails if an item uses a feature missing from any exam it is shown on (decided by its sub-point tags: a walrus item must tag `2.2.1.5`); `lessons.test.ts` does the same for lesson snippets, except in the lesson that teaches the feature (`FEATURE_HOME`). Option texts that are printed output (`outputKey`) are not scanned.
- Items: `output` may be combined with `raises` (what is printed before the exception). Keys of `multi` items, values-mode `order` items and `single` items whose options aren't literal output can't be checked automatically, so review those by hand (run the code) when adding or editing them.
- `src/python/`: the runner. `harness.py` + `runtime.ts` (`runPython`) have no browser dependencies and are shared by the worker and the Node tests; each run gets fresh globals, fresh stdin and a fresh `/home/pyodide/work` seeded with `files`, and errors come back trimmed to `main.py`. `worker.ts` loads Pyodide from `public/pyodide/` at runtime (not bundled). `client.ts` (`pythonRunner`) creates the worker on first run, queues runs, and on a 5 s timeout terminates the worker (error type `Timeout`) so the next run gets a fresh one. `explain.ts` maps errors to a beginner explanation and a lesson id.
- `src/content/verify.ts` (`verifyItem`) + `verify.test.ts`: the output check. Every item's `output`/`raises` is compared with real Python in two Pyodide instances with different `PYTHONHASHSEED`s (catches set-order dependence); wrong `insert` options and wrong `gap` choices must not behave like the key; `altOrders` must print the same. A stem that says "output" must set `output` or `raises`.
- `src/components/RunnerPanel.tsx`: textarea-based code/stdin/output panel (Playground and item Run) until CodeMirror arrives (phase 5). `usePythonRunner` ignores output from superseded runs.
- **Progress** (`src/progress/store.ts`) is the only module that touches `localStorage` (key `pcep101:progress`). It is versioned: on a version mismatch it discards stored data, so bump `VERSION` and add a migration in `load()` when the shape changes, and keep `ProgressSchema` (used by `importProgress`) in step with the `Progress` type. It holds per-item stats with `streak` (consecutive correct answers, reset by a wrong one), mock results, the exam `track`, the two extras toggles (`setTrack` resets them to the track defaults), lessons read and playground code. Components read it with `useProgress()`. `src/progress/readiness.ts`: objective readiness (coverage × accuracy, weighted by syllabus weight), the weak-spot drill and `masteryOf()` (not tested / recent error / past error since correct / always correct).
- **Quiz engine** (`src/quiz/`):
  - `grade.ts`: a `Response` per kind, `isAnswered`, all-or-nothing `grade`. Gap text answers are compared after `normaliseAnswer` (collapse whitespace, drop it around punctuation). `answer.ts` `freshResponse()` starts ordering items scrambled, never in an accepted order.
  - `pools.ts`: practice objectives and items for the learner's track and extras toggle; `objectiveWeights` (section weight shared among its objectives).
  - `sampler.ts`: `buildMockExam` (30-03: one item per objective, + one per extra when extended; 30-02: each block's syllabus count; prefers unseen items; scales time to the real pace when the bank is short), `buildMixedSet` (weighted sampling by objective weight), `buildFocusSet` / `orderLeastMastered` (lowest streak first). Pass `seededRng(n)` in tests.
  - `results.ts` `scoreMock`: percent, pass at the profile's mark, rows by section/block and objective, extras kept in a separate row.
  - `ItemView`: renders all five kinds. Options are never shuffled and are labelled A–F; with the `keyboard` prop, 1–6/A–F select (enable on one ItemView per screen). Multi-select stops at `select`. `revealed` shows the key, every rationale and the explanation.
  - `ItemRun`: "Run the completed code" / "Open in Playground" (navigation state carries code and files). Shown only after Check in practice and the question bank; the mock exam never renders it.
  - `shortcuts.ts` `useShortcuts`: practice and the bank (Enter checks, then advances; ←/→ in the bank), mock (Enter/→ next, ← previous, M flags, R back to review). Ignores keys typed into fields. `ShortcutHint` lists them.
  - `SessionReview`: end-of-practice review, misses first, each expandable.
- **Pages** (`src/pages/`, all lazy-loaded in `src/app/routes.tsx`; keep content imports out of routes and Layout): `/` syllabus overview, `/learn` and `/learn/:objectiveId` (sub-points until lessons exist), `/practice?objective=2.2.3`, `?section=2`, `?mix=10` (each with optional `&focus=1` for least mastered), `?weak=1`, `/questions` and `/questions/:itemId` (bank browser with topic and mastery filters), `/mock`, `/playground`, `/progress` (readiness, export/import).
- **Lessons** (`src/content/lessons/<objectiveId>.mdx`, `3.1.1.mdx` is the reference template): each exports `meta` (validated by `lessonMetaSchema`: `objectiveId`, `updated`, `tldr`, `subpointsCovered` = all of the objective's sub-point ids, optional docs.python.org `links`) and has the sections `## Big idea`, `## Walkthrough`, `## Predict the output`, `## Common mistakes`, `## Exam traps`, `## Try it`, in that order. Code goes in ```` ```python ```` fences (rendered as runnable cells). An ```` ```output ```` or ```` ```error ```` fence right after one (optionally with an ```` ```input ```` fence for `input()` between) states what it prints or the last traceback line it raises; ```` ```text ```` fences are shown but not run. `<Predict>` wraps one python fence and its output fence (2–3 per lesson, tags at column 0, blank lines around the fences); the learner must type a guess before revealing. `src/content/lessons.test.ts` checks structure and coverage, and runs every snippet in two Pyodide instances: claimed output/error must match exactly, and unclaimed snippets must not raise. Each run starts in an empty folder, so file snippets create their own files. MDX: a bare `{`, `}` or `<` in prose breaks the build; wrap it in backticks. The components live in `src/lessons/components.tsx`; `/learn/:objectiveId` renders the lesson with `prose` (colours mapped to theme tokens in `index.css`), "Mark as read", practice links and previous/next navigation in syllabus order (extras last).
- **Theme**: colour tokens (`brand`, `brand-dark`, `accent`, `chalk`, `page`, `header`, `code`) in `src/index.css` via `@theme`. Dark mode follows the OS by remapping the tokens and the slate scale once there, so components don't use `dark:` variants. Text on `bg-code` uses a fixed light colour, because the slate scale inverts in dark mode.
- UI tests (`src/pages/pages.test.tsx`) render the real routes with `createMemoryRouter` and an async `renderAt()` that waits for the lazy page, over the real bank, so keep them independent of item order and pool size.
- `src/app/` (router shell and layout with the non-affiliation footer), `src/pages/`, `src/test/` (setup and one fixture item per kind).

## Purpose

**PCEP101 — "Python Certification Made Simple"** is a self-study web app for the **PCEP** exam (Certified Entry-Level Python Programmer), written in English for people new to Python. It targets **PCEP-30-03** by default, and an exam-track switch selects **PCEP-30-02** (PLAN.md §3b). Examples use varied everyday topics, with no running theme.

It has three parts:
- **Learn**: one full teaching lesson per objective.
- **Check**: practice in five item kinds, plus a 35-item, 50-minute mock exam.
- **Do**: in-browser Python through Pyodide (a playground and auto-graded exercises).

## Authoritative sources

- PCEP-30-03 syllabus (blueprint v1.5): https://pythoninstitute.org/pcep-exam-syllabus. It is the single source of truth for sections, weights, objectives and sub-points. If it changes, update `blueprint.ts` first.
- PCEP-30-02 syllabus: https://pythoninstitute.org/pcep-30-02-exam-syllabus (sold until 2027-11-30). Topics that are only in 30-02 live in the extra objectives `x.1`–`x.6`. Topics that are only in 30-03 (sets, `*args`/`**kwargs`, f-strings, walrus, files, `csv`, `math`, `random`) carry an `exams: ['30-03']` tag on the objective or sub-point. Keep these tags right, because the 30-02 track's pools and mock exam are derived from them. Two learner toggles, one for practice and one for the mock exam, decide whether the `x.*` items are included. They are off by default on the 30-03 track, and the mock toggle is forced on for the 30-02 mock (PLAN.md §3b).
- The footer and README say "Not affiliated with or endorsed by the Python Institute."
- Python Essentials 1 (https://edube.org/study/pe1) is linked as a free extra resource.

## Rules that span the codebase

- **Content is data.** Lessons, questions and exercises are files under `src/content/`, validated with Zod and rendered generically. To add a lesson, question or exercise, add data, not a component.
- **Never trust a hand-written output.** For any item or lesson snippet that claims what code prints, the expected output must be checked by running the code in Pyodide in a test, never written from memory. Code in items must be deterministic: seed `random`, and don't print set or dict ordering unless it's guaranteed.
- **Running item code** is allowed in practice mode only after the answer has been checked. The mock exam never exposes Run or Open-in-editor.
- Pyodide is self-hosted. It's copied from the `pyodide` npm package into the git-ignored `public/pyodide/` before `dev`, `build` and `test`, and there's no CDN at runtime. It runs in a Web Worker and loads lazily, so keep it out of the initial bundle.
- Write every question for this app. Never copy from the live exam or from the Python Institute's practice tests.

## Gotchas

- Python 3.14 words many errors differently from older versions (e.g. `ValueError: list.index(x): x not in list`, `too many values to unpack (expected 2, got 3)`, `ZeroDivisionError: division by zero` for `//` and `%`, `FileNotFoundError: [Errno 44] ...` under Pyodide, `csv.writer` ending rows with `\r\n`). Lessons and items quote what Pyodide prints; the tests enforce it.

- Pyodide randomises string hashing per instance, so set and dict-of-set ordering can change between runs; the output check uses two fixed hash seeds to catch it.
- Python error messages change between versions (Pyodide 314 = Python 3.14). Tests of error handling take messages from real Pyodide runs, never typed from memory.
- The in-memory FS can't remove the current directory; the harness `chdir`s out before resetting the work dir.
