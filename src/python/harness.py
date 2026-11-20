# Runs learner code inside Pyodide. Loaded once per Pyodide instance by
# runtime.ts; every run gets fresh globals and a fresh working directory.
import builtins
import contextlib
import io
import json
import linecache
import os
import shutil
import sys
import traceback

WORK = "/home/pyodide/work"
FILENAME = "main.py"


def pcep_reset(files_json):
    """Empty the working directory and seed it with the run's fixture files."""
    os.chdir("/")  # the in-memory FS can't remove the current directory
    if os.path.isdir(WORK):
        shutil.rmtree(WORK)
    os.makedirs(WORK)
    os.chdir(WORK)
    for name, text in json.loads(files_json).items():
        with open(os.path.join(WORK, name), "w", encoding="utf-8", newline="") as f:
            f.write(text)


def pcep_files():
    """Text of every file in the working directory after a run."""
    out = {}
    for name in sorted(os.listdir(WORK)):
        path = os.path.join(WORK, name)
        if os.path.isfile(path):
            try:
                with open(path, encoding="utf-8", newline="") as f:
                    out[name] = f.read()
            except UnicodeDecodeError:
                out[name] = None
    return json.dumps(out)


def _error(e):
    """An exception as a dict, with the traceback trimmed to the learner's own lines."""
    frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == FILENAME]
    line = frames[-1].lineno if frames else None
    if isinstance(e, SyntaxError) and e.filename == FILENAME:
        line = e.lineno
    text = ""
    if frames:
        text = "Traceback (most recent call last):\n" + "".join(traceback.format_list(frames))
    text += "".join(traceback.format_exception_only(type(e), e))
    return {"type": type(e).__name__, "message": str(e), "line": line, "traceback": text}


def _lines(text):
    """Output compared line by line, ignoring trailing spaces and blank lines at the end."""
    return "\n".join(line.rstrip() for line in text.rstrip().split("\n"))


def _check(scope, check):
    """Evaluates one exercise check (`call`, plus `expect`, `prints` or `raises`) in the learner's globals."""
    result = {"call": check["call"], "passed": False, "got": None, "want": None, "printed": "", "error": None}
    buffer = io.StringIO()
    try:
        with contextlib.redirect_stdout(buffer):
            got = eval(check["call"], scope)
    except Exception as e:
        result["printed"] = buffer.getvalue()
        result["error"] = f"{type(e).__name__}: {e}"
        result["passed"] = check.get("raises") == type(e).__name__
        return result
    result["printed"] = buffer.getvalue()
    result["got"] = repr(got)
    passed = "raises" not in check
    if "expect" in check:
        want = eval(check["expect"], {"__builtins__": builtins})
        result["want"] = repr(want)
        passed = passed and type(got) is type(want) and got == want
    if "prints" in check:
        passed = passed and _lines(result["printed"]) == _lines(check["prints"])
    result["passed"] = passed
    return result


def pcep_run(src, checks_json="[]"):
    """Run src as main.py, then the exercise checks (if any) in its globals.
    Returns JSON: {"error": null or the error, "checks": [...]}."""
    linecache.cache[FILENAME] = (len(src), None, src.splitlines(True), FILENAME)
    scope = {"__name__": "__main__", "__builtins__": builtins}
    error = None
    try:
        exec(compile(src, FILENAME, "exec"), scope)
    except SystemExit:
        pass
    except BaseException as e:
        error = _error(e)
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
    checks = [] if error else [_check(scope, c) for c in json.loads(checks_json)]
    return json.dumps({"error": error, "checks": checks})
