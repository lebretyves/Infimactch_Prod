"""Check tracked documents and compare two checkouts without changing either one.

Usage: python scripts/check-repository-consistency.py [--compare OTHER] [--output REPORT]
The comparison covers bytes and every text line, not semantic correctness of all code.
"""
from pathlib import Path
import argparse
import csv
import hashlib
import io
import json
import re
import subprocess
import sys


def tracked(root):
    names = subprocess.check_output(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=root
    ).decode("utf-8").split("\0")
    return {name: root / name for name in set(names) if name and (root / name).is_file()}


def canonical(name):
    return "docs/" + name[len("docs_intern/"):] if name.startswith("docs_intern/") else name


def text_content(raw):
    if b"\0" in raw:
        return None
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return None


def normalized(root, name, text):
    if name.endswith(".md"):
        def link(match):
            target = match[2]
            if ":" in target or target.startswith("#"):
                return match[0]
            path, sep, anchor = target.partition("#")
            try:
                rel = (root / name).parent.joinpath(path).resolve().relative_to(root.resolve()).as_posix()
            except ValueError:
                return match[0]
            return "[" + match[1] + "](@/" + canonical(rel) + (sep + anchor if sep else "") + ")"
        text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link, text)
    # These are the documented checkout-specific paths, not runtime behavior changes.
    text = re.sub(r"(?<![A-Za-z0-9_-])docs_intern/", "docs/", text)
    if name in {"scripts/verify-finess.cjs", "scripts/verify-france-travail.cjs",
                "scripts/verify-france-travail-rectification.cjs", "scripts/verify-partial-matching-live.cjs"}:
        text = text.replace("'../docs_intern'", "'../docs'")
    return text.replace("\r\n", "\n")


def inspect(root):
    files = tracked(root)
    errors, records = [], []
    by_canonical = {}
    for name, path in sorted(files.items()):
        key = canonical(name)
        if key in by_canonical:
            errors.append(f"Duplicate canonical path: {by_canonical[key]} / {name}")
        by_canonical[key] = name
        raw = path.read_bytes()
        text = text_content(raw)
        records.append({"path": name, "sha256": hashlib.sha256(raw).hexdigest(),
                        "lines": len(text.splitlines()) if text is not None else None})
        if name.endswith(".json"):
            try:
                json.loads(raw.decode("utf-8-sig"))
            except (ValueError, UnicodeDecodeError):
                errors.append(f"Invalid JSON: {name}")
        if name.endswith(".md") and text is not None:
            for target in re.findall(r"\]\(([^)]+)\)", text):
                if ":" not in target and not target.startswith("#"):
                    if not path.parent.joinpath(target.split("#")[0]).exists():
                        errors.append(f"Broken local link: {name}: {target}")
        if key == "docs/rendu/RECETTE_FINALE.csv":
            for row in csv.DictReader(io.StringIO(text), delimiter=";"):
                if row["etat"] == "A_RECETTER_SUR_VERSION_PUBLIEE" and row["version"]:
                    errors.append(f"Untested scenario has prefilled version: {name}")
                if row["etat"] == "REUSSI" and not all(row.get(k) for k in ["version", "preuve", "date", "observateur"]):
                    errors.append(f"Successful scenario lacks evidence: {name}")
        if key == "docs/n8n/InfiMatch-production-reprise-et-rappels.json":
            workflow = json.loads(text)
            schedules = [n for n in workflow["nodes"] if n["type"] == "n8n-nodes-base.scheduleTrigger"]
            expected = [{"field": "hours", "hoursInterval": 4}]
            if len(schedules) != 1 or schedules[0]["parameters"]["rule"]["interval"] != expected:
                errors.append(f"Retry schedule is not four hours: {name}")
            if workflow.get("settings", {}).get("timezone") != "Europe/Paris":
                errors.append(f"Retry timezone differs: {name}")
        if key in {"README.md", "docs/DEPLOIEMENT_PRODUCTION.md", "docs/presentation/DOSSIER_SOUTENANCE.md"}:
            if re.search(r"d2de5b8|ff0dddb|fd68a377", text):
                errors.append(f"Superseded delivery reference in current guide: {name}")
    return files, {"files": records, "errors": errors}


def compare(left, right, lf, rf):
    lookup = {canonical(n): n for n in rf}
    records, errors, used = [], [], set()
    for name, path in sorted(lf.items()):
        other = lookup.get(canonical(name))
        if other is None:
            errors.append(f"Missing in comparison checkout: {name}")
            continue
        used.add(other)
        a, b = path.read_bytes(), rf[other].read_bytes()
        status = "identical"
        if a != b:
            x, y = text_content(a), text_content(b)
            if x is not None and y is not None and x.replace("\r\n", "\n") == y.replace("\r\n", "\n"):
                status = "line_endings_only"
            elif x is not None and y is not None and normalized(left, name, x) == normalized(right, other, y):
                status = "checkout_paths"
            else:
                status = "different"
                errors.append(f"Unexplained difference: {name} / {other}")
        records.append({"left": name, "right": other, "status": status})
    for name in sorted(set(rf) - used):
        # Original Epitech framing document, intentionally kept only in the school repository.
        status = "school_reference" if name == "documentation/infimatch_note_cadrage.pdf" else "unexpected_extra"
        records.append({"left": None, "right": name, "status": status})
        if status == "unexpected_extra":
            errors.append(f"Unexpected file in comparison checkout: {name}")
    return {"files": records, "errors": errors}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--compare", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    files, result = inspect(root)
    report = {"scope": "All tracked/local unignored files: structural checks and exact comparison; not a full semantic audit", "primary": result}
    errors = list(result["errors"])
    if args.compare:
        other = args.compare.resolve()
        other_files, other_result = inspect(other)
        report["secondary"] = other_result
        report["comparison"] = compare(root, other, files, other_files)
        errors.extend(other_result["errors"] + report["comparison"]["errors"])
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Checked {len(files)} files; {len(errors)} errors")
    for error in errors:
        print(error)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
