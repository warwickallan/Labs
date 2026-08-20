"""test_writer.py — the disciplined write path proves its own safety.

No live instance: these tests exercise the GATE and the audit/refusal
contract, which is where the safety lives. The DOM primitives are covered
end-to-end against the fixture in test_end_to_end when write is enabled
there; here we prove that nothing writes without the human's opt-in.
"""

import io
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import concerto_writer as writer  # noqa: E402

CONFIG = HERE.parent / "harness.config.json"
PASS = 0
FAIL = 0


def check(name, cond):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ok    {name}")
    else:
        FAIL += 1
        print(f"  FAIL  {name}")


def with_config(value):
    """Context: set harness.config.json to a value (or remove it), restoring
    whatever was there before so a developer's real switch is never clobbered."""
    class _Ctx:
        def __enter__(self):
            self.had = CONFIG.exists()
            self.prev = CONFIG.read_text(encoding="utf-8") if self.had else None
            if value is None:
                if CONFIG.exists():
                    CONFIG.unlink()
            else:
                CONFIG.write_text(json.dumps(value), encoding="utf-8")
            return self

        def __exit__(self, *a):
            if self.had:
                CONFIG.write_text(self.prev, encoding="utf-8")
            elif CONFIG.exists():
                CONFIG.unlink()
    return _Ctx()


class DeadSession:
    """A session that must NEVER be touched — proves the gate refuses before
    any browser interaction happens."""
    def __getattr__(self, name):
        raise AssertionError(f"writer touched the session ({name}) while writing was disabled")


print("Concerto writer — safety gate")

# 1. no config file → writing is off
with with_config(None):
    check("no config file means writing is disabled", writer.write_enabled() is False)
    try:
        writer.execute(DeadSession(), {"op": "rename_status", "status_guid": "x", "from": "a", "to": "b"}, apply=True)
        check("execute refused with no config", False)
    except writer.WriteRefused:
        check("execute refused with no config", True)

# 2. writeEnabled false → off
with with_config({"writeEnabled": False}):
    check("writeEnabled:false means disabled", writer.write_enabled() is False)
    try:
        writer.execute(DeadSession(), {"op": "delete_action", "action_guid": "x"}, apply=True)
        check("execute refused when false", False)
    except writer.WriteRefused:
        check("execute refused when false", True)

# 3. writeEnabled true → enabled, but unknown op still refused
with with_config({"writeEnabled": True}):
    check("writeEnabled:true means enabled", writer.write_enabled() is True)
    try:
        writer.execute(DeadSession(), {"op": "drop_database"}, apply=True)
        check("unknown op refused even when enabled", False)
    except writer.WriteRefused:
        check("unknown op refused even when enabled", True)

# 4. a malformed config is treated as OFF, never as ON
with with_config(None):
    CONFIG.write_text("{ this is not json", encoding="utf-8")
    try:
        check("malformed config is treated as disabled", writer.write_enabled() is False)
    finally:
        CONFIG.unlink()

# 5. the switch is read PER CALL (revocable mid-session)
with with_config({"writeEnabled": True}):
    check("enabled reads true", writer.write_enabled() is True)
    CONFIG.write_text(json.dumps({"writeEnabled": False}), encoding="utf-8")
    check("revoked without restart reads false", writer.write_enabled() is False)

print(f"\nPASS {PASS}/{PASS + FAIL}" if FAIL == 0 else f"\nFAIL {PASS}/{PASS + FAIL}")
sys.exit(1 if FAIL else 0)
