# PCEP101 — Python Certification Made Simple

A free, self-study web app for the **PCEP™ – Certified Entry-Level Python Programmer** exam, written for people new to Python. It targets **PCEP-30-03** and can switch to **PCEP-30-02**.

- **Learn**: one teaching lesson per syllabus objective.
- **Check**: practice questions in five formats, plus a timed mock exam.
- **Do**: real Python in the browser through [Pyodide](https://pyodide.org), with a playground and auto-graded exercises.

Live site: https://mhoffmann-wbs.github.io/PCEP101/

## Develop

```sh
npm install
npm run dev      # copies the Pyodide runtime into public/pyodide/, then starts Vite
npm test         # content tests and unit tests (Vitest)
npm run lint     # oxlint
npm run build    # type-check and build into dist/
```

Pushing to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Sources

- PCEP-30-03 syllabus: https://pythoninstitute.org/pcep-exam-syllabus
- PCEP-30-02 syllabus: https://pythoninstitute.org/pcep-30-02-exam-syllabus
- Free course: [Python Essentials 1](https://edube.org/study/pe1)

All questions are written for this app.

---

Not affiliated with or endorsed by the Python Institute. PCEP is a trademark of the Python Institute.
