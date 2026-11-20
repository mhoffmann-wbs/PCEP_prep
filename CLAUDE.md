# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Phase 0 (scaffold) is done; next is phase 1 (Pyodide spike). **`PLAN.md` is the build plan and sets the order of work**: it records the decisions made, the content map, the item kinds and the phases. As parts get built, replace the plan-level notes below with what actually exists (commands, file layout, gotchas).

## Commands

- `npm run dev` / `npm run build` / `npm test`: each first runs `scripts/setup-pyodide.mjs`, which copies the pinned `pyodide` package (exact version in `package.json`) into `public/pyodide/`.
- `npm run lint` (oxlint, config in `.oxlintrc.json`), `npm run typecheck`.
- Run one test file: `npx vitest run src/content/schema.test.ts`. Tests run in Node by default; component tests start with `// @vitest-environment jsdom`.
- `BASE_PATH=/PCEP101/ npm run build` builds for Pages. `.github/workflows/deploy.yml` lints, tests, builds, copies `index.html` to `404.html` and deploys on push to `main`.

## Layout

- `src/content/blueprint.ts`: both exam profiles, the 35 core objectives (titles and sub-points verbatim from the 30-03 syllabus), the extras `x.1`–`x.6`, `exams` tags and helpers (`subpointInExam`, `mockShape`). Sub-point ids are `<objectiveId>.<n>`, e.g. `2.2.1.5`.
- `src/content/schema.ts`: Zod item schema (`single`, `multi`, `gap`, `order`, `insert`). Item ids are `<objectiveId>-NN`. Gap blanks are `__BLANK1__`, `__BLANK2__`… in `code`. `output`/`raises` hold what the complete program prints or raises; `completeProgram()` builds that program with the answer filled in, for the Pyodide output check (phase 1).
- `src/content/questions/<objectiveId>.json`: a JSON array of items per objective, loaded by `src/content/bank.ts` (`ITEMS`, `itemInExam`).
- `src/content/quality.ts`: the anti-giveaway checks, run over the real bank by `bank.test.ts`.
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
