"""migrate_to_store.py — move project data out of the repository working
tree and into the durable private store.

Copies apps/concerto-studio/projects/<key>/ into the store root, initialises
the store as a git repository (local history), and verifies every file
arrived. It COPIES — the repo-side folder is left untouched so nothing is
lost if the store is later moved; delete it yourself once you are satisfied.

It will not run if the resolved store root is inside the public repository.

Run:  python apps/concerto-studio/store/migrate_to_store.py
      python apps/concerto-studio/store/migrate_to_store.py --verify
"""

from __future__ import annotations

import filecmp
import json
import pathlib
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import store_server as store  # noqa: E402

SOURCE = HERE.parent / "projects"

GITIGNORE = """# The private project store. Nothing here belongs in a public repository.
# Kept deliberately permissive: this repo exists to hold customer data safely.
*.tmp
"""

README = """# Concerto Studio — private project store

Customer project data for the Concerto Configuration Studio. **Private.**
Instance URLs, captured configuration, findings and change receipts live
here, never in the public Labs repository.

Layout:

    <key>/project.json          the project record (Studio format)
    <key>/snapshots/*.json      captured instance crawls
    <key>/changes/*.md          change receipts
    <key>/findings/*.md         findings and pending decisions
    versions/<key>-<stamp>.json every previous version of every project.json

The Studio reads and writes this store through
`apps/concerto-studio/store/store_server.py` (port 8603). Every save banks
the previous version first and commits here — nothing is overwritten.

## Off-machine backup

A local git repository protects against a bad save, not against losing the
machine. Add a PRIVATE remote:

    git remote add origin <url-of-a-PRIVATE-repo>
    git push -u origin main

The Studio's Settings → Storage panel reports which of these is true, so the
state of the backup is never a matter of belief.
"""


def migrate() -> int:
    store.ensure_root()
    root = store.ROOT
    print(f"source : {SOURCE}")
    print(f"store  : {root}\n")
    if not SOURCE.exists():
        print("No repo-side projects folder — nothing to migrate.")
        return 0

    copied, skipped = [], []
    for d in sorted(SOURCE.iterdir()):
        if d.is_file():
            if d.name == "manifest.json":
                continue  # the store lists its own projects; a manifest would drift
            continue
        target = root / d.name
        if target.exists():
            skipped.append(d.name)
            continue
        shutil.copytree(d, target)
        copied.append(d.name)

    for name, text in (("README.md", README), (".gitignore", GITIGNORE)):
        f = root / name
        if not f.exists():
            f.write_text(text, encoding="utf-8")

    code, _ = store.git("rev-parse", "--is-inside-work-tree")
    if code != 0:
        store.git("init")
        store.git("checkout", "-b", "main")
        print("initialised the store as a git repository (local history)")
    result = store.commit("Studio: migrate project data into the private store")
    print(f"copied  : {copied or '—'}")
    print(f"skipped : {skipped or '—'} (already in the store)")
    print(f"commit  : {result}")
    return verify()


def verify() -> int:
    """Every source file must exist in the store with identical content."""
    root = store.ROOT
    missing, differing, checked = [], [], 0
    if not SOURCE.exists():
        print("no source folder to verify against")
        return 0
    for src in SOURCE.rglob("*"):
        if src.is_dir() or src.name == "manifest.json":
            continue
        rel = src.relative_to(SOURCE)
        dst = root / rel
        checked += 1
        if not dst.exists():
            missing.append(str(rel))
        elif not filecmp.cmp(src, dst, shallow=False):
            differing.append(str(rel))

    print(f"\nverified {checked} file(s)")
    if missing:
        print(f"  MISSING   : {missing}")
    if differing:
        print(f"  DIFFERING : {differing}")
    h = store.health()
    print(f"  durability: {h['durability']}")
    for w in h["warnings"]:
        print(f"  WARNING   : {w}")
    if not missing and not differing:
        print("\nPASS — every project file is present in the store, byte-identical.")
        return 0
    print("\nFAIL — the store does not yet hold everything.")
    return 1


if __name__ == "__main__":
    raise SystemExit(verify() if "--verify" in sys.argv else migrate())
