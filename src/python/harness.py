# Runs learner code inside Pyodide. Loaded once per Pyodide instance by
# runtime.ts; every run gets fresh globals and a fresh working directory.
import builtins
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


def pcep_run(src):
    """Run src as main.py. Returns null, or the error as JSON, with the
    traceback trimmed to the learner's own lines."""
    linecache.cache[FILENAME] = (len(src), None, src.splitlines(True), FILENAME)
    scope = {"__name__": "__main__", "__builtins__": builtins}
    try:
        exec(compile(src, FILENAME, "exec"), scope)
    except SystemExit:
        pass
    except BaseException as e:
        frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == FILENAME]
        line = frames[-1].lineno if frames else None
        if isinstance(e, SyntaxError) and e.filename == FILENAME:
            line = e.lineno
        text = ""
        if frames:
            text = "Traceback (most recent call last):\n" + "".join(traceback.format_list(frames))
        text += "".join(traceback.format_exception_only(type(e), e))
        return json.dumps({"type": type(e).__name__, "message": str(e), "line": line, "traceback": text})
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
    return "null"
