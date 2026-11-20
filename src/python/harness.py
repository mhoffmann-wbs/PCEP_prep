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


def _quiet_input(prompt=""):
    """input() that doesn't print its prompt, so exercise output can be compared exactly."""
    return builtins.input()


def _exit(code=None):
    """exit()/quit() for learner code. The built-in ones close sys.stdin, which
    would break input() in every later run on this Pyodide instance."""
    raise SystemExit(code)


def _scope():
    """Fresh globals for one run of main.py."""
    return {"__name__": "__main__", "__builtins__": builtins, "exit": _exit, "quit": _exit}


def pcep_run(src, checks_json="[]", quiet_input=False):
    """Run src as main.py, then the exercise checks (if any) in its globals.
    Returns JSON: {"error": null or the error, "checks": [...]}."""
    linecache.cache[FILENAME] = (len(src), None, src.splitlines(True), FILENAME)
    scope = _scope()
    if quiet_input:
        scope["input"] = _quiet_input
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


# ---- Step-through tracing -------------------------------------------------

MAX_STEPS = 1000
MAX_REPR = 120


class _TraceLimit(BaseException):
    """Stops a trace that reaches MAX_STEPS. Not an Exception, so learner code can't catch it."""


class _Tee:
    """Stands in for sys.stdout: passes text on and keeps what was printed since the last step."""

    def __init__(self, inner):
        self.inner = inner
        self.pending = []

    def write(self, text):
        self.pending.append(text)
        return self.inner.write(text)

    def flush(self):
        self.inner.flush()

    def take(self):
        text = "".join(self.pending)
        self.pending = []
        return text


def _short(text):
    return text if len(text) <= MAX_REPR else text[: MAX_REPR - 1] + "…"


class _Values:
    """Describes values for the visualizer. Lists, dicts and sets get a number
    (#1, #2…) per object, so two names showing the same number share one object."""

    MUTABLE = (list, dict, set)

    def __init__(self):
        self.labels = {}
        self.keep = []  # keeps labelled objects alive so their ids aren't reused

    def describe(self, value):
        kind = type(value).__name__
        if callable(value) and hasattr(value, "__code__"):
            text = f"function {value.__name__}"
        elif kind == "module":
            text = f"module {value.__name__}"
        else:
            try:
                text = repr(value)
            except Exception:
                text = f"<{kind}>"
        ref = None
        if isinstance(value, self.MUTABLE):
            key = id(value)
            if key not in self.labels:
                self.labels[key] = len(self.labels) + 1
                self.keep.append(value)
            ref = self.labels[key]
        return {"value": _short(text), "type": kind, "ref": ref}

    def frame_vars(self, names):
        return [
            {"name": name, **self.describe(value)}
            for name, value in names.items()
            if not (name.startswith("__") and name.endswith("__")) and value is not _exit and value is not _echo_input
        ]


def _echo_input(prompt=""):
    """input() for traces: shows the line read in the output, as a terminal does."""
    line = builtins.input(prompt)
    sys.stdout.write(line + "\n")
    return line


def pcep_trace(src):
    """Run src as main.py, recording a step before each line runs, at each
    function return and at each exception. Returns JSON:
    {"error": null or the error, "steps": [...], "truncated": bool}."""
    linecache.cache[FILENAME] = (len(src), None, src.splitlines(True), FILENAME)
    scope = _scope()
    scope["input"] = _echo_input
    values = _Values()
    tee = _Tee(sys.stdout)
    steps = []
    unwinding = set()  # ids of frames an exception is passing through

    def frames(frame):
        stack = []
        while frame is not None and frame.f_code.co_filename == FILENAME:
            if frame.f_code.co_name == "<module>":
                stack.append({"name": "Global", "vars": values.frame_vars(scope)})
            else:
                stack.append({"name": frame.f_code.co_name, "vars": values.frame_vars(dict(frame.f_locals))})
            frame = frame.f_back
        return stack[::-1]

    def record(event, line, stack, detail=None):
        steps.append({"event": event, "line": line, "frames": stack, "out": tee.take(), "detail": detail})

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != FILENAME:
            return None
        if len(steps) >= MAX_STEPS:
            raise _TraceLimit
        if event == "line":
            unwinding.discard(id(frame))
            record("line", frame.f_lineno, frames(frame))
        elif event == "return":
            # A frame left because of an exception also "returns" None; that isn't a return.
            if id(frame) not in unwinding and frame.f_code.co_name != "<module>":
                record("return", frame.f_lineno, frames(frame), values.describe(arg)["value"])
            unwinding.discard(id(frame))
        elif event == "exception":
            unwinding.add(id(frame))
            kind, exc, _ = arg
            record("exception", frame.f_lineno, frames(frame), f"{kind.__name__}: {exc}")
        return tracer

    error = None
    truncated = False
    sys.stdout = tee
    try:
        code = compile(src, FILENAME, "exec")
        sys.settrace(tracer)
        exec(code, scope)
    except _TraceLimit:
        truncated = True
    except SystemExit:
        pass
    except BaseException as e:
        error = _error(e)
    finally:
        sys.settrace(None)
        sys.stdout = tee.inner
        sys.stdout.flush()
    if not truncated:
        globals_only = [{"name": "Global", "vars": values.frame_vars(scope)}]
        if error:
            record("error", error["line"], globals_only, f"{error['type']}: {error['message']}")
        else:
            record("end", None, globals_only)
    return json.dumps({"error": error, "steps": steps, "truncated": truncated})
