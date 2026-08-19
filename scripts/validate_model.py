"""Discovery gate 9: validate model/VANILLA-HELPDESK.json.

Checks, in order:

1. Round-trip identity: serialize -> reload -> serialize must be byte-identical
   (canonical JSON, sorted keys). Proves the model is a stable, loss-free
   machine-readable artefact.
2. JSON Schema validation against schemas/vanilla-helpdesk.schema.json
   (uses the `jsonschema` package when installed; otherwise falls back to
   built-in structural checks covering the rules that matter most).
3. Evidence integrity: every evidence reference used anywhere in the model
   must resolve to an entry in the top-level evidence index, and every
   indexed evidence path must exist under evidence/.

Exit code 0 = green; non-zero with a plain report otherwise.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "model" / "VANILLA-HELPDESK.json"
SCHEMA = ROOT / "schemas" / "vanilla-helpdesk.schema.json"

CONFIDENCE = {
    "VERIFIED — OBSERVED",
    "VERIFIED — STRUCTURAL",
    "INFERRED",
    "UNKNOWN",
}

errors: list[str] = []


def canonical(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, indent=2)


def check_roundtrip(model: object) -> None:
    first = canonical(model)
    second = canonical(json.loads(first))
    if first != second:
        errors.append("Round-trip identity FAILED: serialize->reload->serialize differs.")


def check_schema(model: dict) -> None:
    try:
        import jsonschema  # type: ignore
    except ImportError:
        _fallback_structural(model)
        return
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    validator = jsonschema.Draft202012Validator(schema)
    for err in sorted(validator.iter_errors(model), key=lambda e: list(e.absolute_path)):
        path = "/".join(str(p) for p in err.absolute_path) or "<root>"
        errors.append(f"Schema violation at {path}: {err.message}")


def _walk_facts(node: object, path: str) -> None:
    """Fallback structural check: confidence enums and evidence lists."""
    if isinstance(node, dict):
        if "confidence" in node and node["confidence"] not in CONFIDENCE:
            errors.append(f"{path}: invalid confidence {node['confidence']!r}")
        if "confidence" in node and "evidence" not in node:
            errors.append(f"{path}: fact carries confidence but no evidence refs")
        for key, value in node.items():
            _walk_facts(value, f"{path}/{key}")
    elif isinstance(node, list):
        for i, item in enumerate(node):
            _walk_facts(item, f"{path}[{i}]")


def _fallback_structural(model: dict) -> None:
    print("note: `jsonschema` not installed; running built-in structural checks only.")
    for key in ("metadata", "helpdeskTypes", "evidence"):
        if key not in model:
            errors.append(f"<root>: missing required key {key!r}")
    meta = model.get("metadata", {})
    if meta.get("mode") != "DISCOVER":
        errors.append("metadata.mode must be 'DISCOVER' (read-only discovery only).")
    if meta.get("modelVersion") not in (1, 2):
        errors.append("metadata.modelVersion must be 1 or 2.")
    _walk_facts(model.get("helpdeskTypes", []), "helpdeskTypes")
    _walk_facts(model.get("sharedConfiguration", []), "sharedConfiguration")


def check_evidence(model: dict) -> None:
    index: dict[str, str] = {}
    for i, entry in enumerate(model.get("evidence", [])):
        eid, path = entry.get("id"), entry.get("path")
        if not eid or not path:
            errors.append(f"evidence[{i}]: entry needs both id and path")
            continue
        if eid in index:
            errors.append(f"evidence[{i}]: duplicate id {eid}")
        index[eid] = path
        if not (ROOT / path).exists():
            errors.append(f"evidence[{i}] ({eid}): file not found: {path}")

    def walk(node: object, path: str) -> None:
        if isinstance(node, dict):
            refs = node.get("evidence")
            if isinstance(refs, list):
                for ref in refs:
                    if isinstance(ref, str) and ref not in index:
                        errors.append(f"{path}: evidence ref {ref} not in evidence index")
            for key, value in node.items():
                if key == "evidence":
                    continue
                walk(value, f"{path}/{key}")
        elif isinstance(node, list):
            for i, item in enumerate(node):
                walk(item, f"{path}[{i}]")

    walk(model.get("helpdeskTypes", []), "helpdeskTypes")
    walk(model.get("sharedConfiguration", []), "sharedConfiguration")


def main() -> int:
    if not MODEL.exists():
        print(f"FAIL: model not found at {MODEL}")
        return 1
    try:
        model = json.loads(MODEL.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"FAIL: model is not valid JSON: {exc}")
        return 1

    check_roundtrip(model)
    if isinstance(model, dict):
        check_schema(model)
        check_evidence(model)
    else:
        errors.append("<root>: model must be a JSON object")

    if errors:
        print(f"FAIL: {len(errors)} problem(s):")
        for err in errors:
            print(f"  - {err}")
        return 1

    types = model.get("helpdeskTypes", [])
    print("OK: round-trip identity, schema, and evidence integrity all pass.")
    print(
        f"    helpdeskTypes={len(types)} "
        f"evidence={len(model.get('evidence', []))} "
        + " ".join(
            f"{t.get('name')}(statuses={len(t.get('statuses', []))},"
            f" actions={len(t.get('actions', []))},"
            f" relationships={len(t.get('relationships', []))})"
            for t in types
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
