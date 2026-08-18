#!/usr/bin/env python3
"""Validate skillset library files (SKILLS/, AGENTS/, KNOWLEDGE/).

Checks frontmatter structure, naming, [[link]] resolution, and
platform-agnostic rules per CLAUDE.md. Stdlib only — no PyYAML.

Usage: python3 scripts/validate.py [repo-root]
Exit code 1 if any errors are found. Emits GitHub Actions annotations
when GITHUB_ACTIONS is set.
"""

import os
import re
import sys

FOLDERS = {"SKILLS": "SKILL", "AGENTS": "AGENT", "KNOWLEDGE": "KNOWLEDGE"}
# ASSETS/ holds runnable files (scripts, templates) rather than markdown docs.
# They carry no frontmatter — they are code — so they are validated separately.
ASSETS_DIR = "ASSETS"
REQUIRED_KEYS = ("name", "type", "description")
# key -> types allowed to declare it
FIELD_TYPES = {
    "name": {"SKILL", "AGENT", "KNOWLEDGE"},
    "type": {"SKILL", "AGENT", "KNOWLEDGE"},
    "description": {"SKILL", "AGENT", "KNOWLEDGE"},
    "knowledge": {"SKILL", "AGENT"},
    "mcp": {"SKILL", "AGENT"},
    "agents": {"SKILL"},
    "assets": {"SKILL", "AGENT"},
    "triggers": {"SKILL"},
    "teams": {"SKILL"},
}
LIST_KEYS = {"knowledge", "agents", "mcp", "triggers", "teams", "assets"}
KEBAB = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
LINK = re.compile(r"\[\[([a-z0-9-]+)\]\]")
# generic placeholders used when *describing* the link convention, not real refs
LINK_PLACEHOLDERS = {"link", "links", "wiki-links", "name"}
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")
RED_FLAGS = (
    ("Agent(", "platform-specific dispatch — use \"Dispatch to [[agent-name]]\" instead"),
    ("~/.claude/", "hardcoded platform path — use [[links]] and let the projector resolve"),
    ("/Users/", "hardcoded user path — use [[links]] or relative references"),
)


class Reporter:
    def __init__(self):
        self.errors = 0
        self.warnings = 0
        self.github = os.environ.get("GITHUB_ACTIONS") == "true"

    def error(self, path, line, msg):
        self.errors += 1
        if self.github:
            print(f"::error file={path},line={line}::{msg}")
        print(f"  ERROR  {path}:{line}  {msg}")

    def warn(self, path, line, msg):
        self.warnings += 1
        if self.github:
            print(f"::warning file={path},line={line}::{msg}")
        print(f"  warn   {path}:{line}  {msg}")


def parse_frontmatter(text, path, rep):
    """Parse the strict skillset frontmatter subset.

    Supports: `key: scalar`, `key: >` / `key: >-` folded blocks,
    `key: []`, and `key:` followed by `  - "item"` lines.
    Returns (fields, body_start_line) where fields maps
    key -> (value, line). Lists are Python lists; scalars are strings.
    Returns (None, 0) if there is no valid frontmatter block.
    """
    lines = text.split("\n")
    if not lines or lines[0] != "---":
        rep.error(path, 1, "missing frontmatter — file must start with `---`")
        return None, 0
    end = None
    for i in range(1, len(lines)):
        if lines[i] == "---":
            end = i
            break
    if end is None:
        rep.error(path, 1, "unterminated frontmatter — no closing `---` found")
        return None, 0

    fields = {}
    key = None       # current key collecting a list or folded block
    mode = None      # "list" | "fold"
    for i in range(1, end):
        line = lines[i]
        lineno = i + 1
        if not line.strip():
            continue
        m = re.match(r"^([A-Za-z_-]+):(.*)$", line)
        if m:
            key, rest = m.group(1), m.group(2).strip()
            # Strip inline comments (YAML: `#` preceded by whitespace, or the
            # whole value, starts a comment) so e.g. `teams: [] # note` parses.
            rest = re.sub(r"(^|\s)#.*$", "", rest).strip()
            if key in fields:
                rep.error(path, lineno, f"duplicate frontmatter key `{key}`")
                continue
            if rest in (">", ">-"):
                fields[key] = ["", lineno]
                mode = "fold"
            elif rest == "[]":
                fields[key] = [[], lineno]
                mode = None
            elif rest == "":
                fields[key] = [[], lineno]
                mode = "list"
            else:
                fields[key] = [rest, lineno]
                mode = None
        elif line.startswith("  ") and key is not None:
            content = line.strip()
            if mode == "fold":
                cur = fields[key][0]
                fields[key][0] = (cur + " " + content).strip()
            elif mode == "list":
                lm = re.match(r'^- +(?:"(.*)"|\'(.*)\'|(.+))$', content)
                if not lm:
                    rep.error(path, lineno, f"malformed list item under `{key}`: {content!r}")
                    continue
                item = next(v for v in lm.groups() if v is not None)
                if not isinstance(fields[key][0], list):
                    rep.error(path, lineno, f"list item under scalar key `{key}`")
                    continue
                fields[key][0].append(item)
            else:
                rep.error(path, lineno, f"unexpected indented line (key `{key}` is not a list or folded block)")
        else:
            rep.error(path, lineno, f"unparseable frontmatter line: {line.strip()!r} "
                                    "(expected `key: value`, `key: >`, or `  - \"item\"`)")
    return {k: (v[0], v[1]) for k, v in fields.items()}, end + 1


def strip_code(text):
    """Remove fenced code blocks and inline backtick spans, preserving
    line count so reported line numbers stay accurate."""
    out = []
    in_fence = False
    for line in text.split("\n"):
        stripped = line.lstrip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            out.append("")
            continue
        if in_fence:
            out.append("")
            continue
        out.append(re.sub(r"`[^`]*`", "", line))
    return "\n".join(out)


def collect_stems(root):
    stems = set()
    for folder in FOLDERS:
        d = os.path.join(root, folder)
        if not os.path.isdir(d):
            continue
        for fn in os.listdir(d):
            if fn.endswith(".md"):
                stems.add(fn[:-3])
    return stems


def collect_assets(root):
    """Filenames present in ASSETS/, e.g. {"deck-helpers.js"}."""
    d = os.path.join(root, ASSETS_DIR)
    if not os.path.isdir(d):
        return set()
    return {fn for fn in os.listdir(d) if not fn.startswith(".")}


def validate_assets_dir(root, rep):
    """ASSETS/ is flat and holds no markdown — docs belong in KNOWLEDGE/."""
    d = os.path.join(root, ASSETS_DIR)
    if not os.path.isdir(d):
        return 0
    count = 0
    for fn in sorted(os.listdir(d)):
        if fn.startswith("."):
            continue
        rel = f"{ASSETS_DIR}/{fn}"
        if os.path.isdir(os.path.join(d, fn)):
            rep.error(rel, 1, "subdirectories are not allowed — ASSETS/ is flat")
            continue
        if fn.endswith(".md"):
            rep.error(rel, 1, "markdown does not belong in ASSETS/ — put docs in KNOWLEDGE/")
            continue
        if "." not in fn:
            rep.warn(rel, 1, "asset has no file extension — consumers resolve assets by filename")
        count += 1
    return count


def validate_file(root, folder, fn, stems, assets, mcp_registry, rep):
    relpath = f"{folder}/{fn}"
    path = os.path.join(root, folder, fn)
    expected_type = FOLDERS[folder]
    with open(path, encoding="utf-8") as f:
        text = f.read()

    fields, body_start = parse_frontmatter(text, relpath, rep)
    if fields is None:
        return

    # required keys
    for k in REQUIRED_KEYS:
        if k not in fields or fields[k][0] in ("", []):
            rep.error(relpath, 1, f"missing or empty required frontmatter field `{k}`")

    # type matches folder
    ftype = fields.get("type", ("", 0))
    if "type" in fields and ftype[0] != expected_type:
        rep.error(relpath, ftype[1],
                  f"type is `{ftype[0]}` but files in {folder}/ must be `type: {expected_type}`")

    # name matches filename, kebab-case
    stem = fn[:-3]
    if "name" in fields:
        name, nline = fields["name"]
        if name != stem:
            rep.error(relpath, nline, f"name `{name}` does not match filename `{stem}`")
        if not KEBAB.match(str(name)):
            rep.error(relpath, nline, f"name `{name}` is not kebab-case (lowercase letters, digits, hyphens)")

    # fields allowed for this type
    for k, (val, line) in fields.items():
        allowed = FIELD_TYPES.get(k)
        if allowed is None:
            rep.error(relpath, line, f"unknown frontmatter field `{k}`")
        elif expected_type not in allowed:
            rep.error(relpath, line,
                      f"field `{k}` is not allowed on type {expected_type} "
                      f"(allowed on: {', '.join(sorted(allowed))})")
        if k in LIST_KEYS and not isinstance(val, list):
            rep.error(relpath, line, f"field `{k}` must be a list (`- \"item\"` entries or `[]`)")

    # [[link]] resolution — frontmatter lists + code-stripped body
    for k in ("knowledge", "agents"):
        if k in fields and isinstance(fields[k][0], list):
            for item in fields[k][0]:
                m = LINK.fullmatch(item.strip())
                if not m:
                    rep.error(relpath, fields[k][1],
                              f"`{k}` entry {item!r} must be a quoted \"[[wiki-link]]\"")
                elif m.group(1) not in stems:
                    rep.error(relpath, fields[k][1],
                              f"`{k}` link [[{m.group(1)}]] does not resolve to any file in "
                              "SKILLS/, AGENTS/, or KNOWLEDGE/")

    # assets are plain filenames, not [[links]] — they carry extensions and
    # are not part of the markdown knowledge graph
    if "assets" in fields and isinstance(fields["assets"][0], list):
        for item in fields["assets"][0]:
            item = item.strip()
            if LINK.fullmatch(item):
                rep.error(relpath, fields["assets"][1],
                          f"`assets` entry {item!r} must be a plain filename with its "
                          "extension, not a [[wiki-link]]")
            elif "/" in item:
                rep.error(relpath, fields["assets"][1],
                          f"`assets` entry {item!r} must be a bare filename — ASSETS/ is flat")
            elif item not in assets:
                rep.error(relpath, fields["assets"][1],
                          f"`assets` entry {item!r} does not resolve to a file in {ASSETS_DIR}/")

    body_text = "\n".join(text.split("\n")[body_start:])
    clean = strip_code(body_text)
    for i, line in enumerate(clean.split("\n")):
        lineno = body_start + i + 1
        for m in LINK.finditer(line):
            ref = m.group(1)
            if ref in LINK_PLACEHOLDERS:
                continue
            if ref not in stems:
                rep.error(relpath, lineno, f"[[{ref}]] does not resolve to any library file")
        for needle, msg in RED_FLAGS:
            if needle in line:
                rep.error(relpath, lineno, f"`{needle}` — {msg}")

    # mcp registry cross-check (warning only)
    if "mcp" in fields and isinstance(fields["mcp"][0], list):
        for server in fields["mcp"][0]:
            if mcp_registry is not None and server not in mcp_registry:
                rep.warn(relpath, fields["mcp"][1],
                         f"mcp server `{server}` is not mentioned in KNOWLEDGE/mcp-registry.md")


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rep = Reporter()

    stems = collect_stems(root)
    assets = collect_assets(root)
    registry_path = os.path.join(root, "KNOWLEDGE", "mcp-registry.md")
    mcp_registry = None
    if os.path.isfile(registry_path):
        mcp_registry = open(registry_path, encoding="utf-8").read()

    checked = 0
    for folder in FOLDERS:
        d = os.path.join(root, folder)
        if not os.path.isdir(d):
            rep.error(folder, 1, f"missing library folder {folder}/")
            continue
        for fn in sorted(os.listdir(d)):
            full = os.path.join(d, fn)
            if fn.startswith("."):
                continue
            if os.path.isdir(full):
                rep.error(f"{folder}/{fn}", 1, "subdirectories are not allowed — the library is flat")
                continue
            if not fn.endswith(".md"):
                rep.error(f"{folder}/{fn}", 1, "only .md files are allowed in library folders")
                continue
            validate_file(root, folder, fn, stems, assets, mcp_registry, rep)
            checked += 1

    checked += validate_assets_dir(root, rep)

    # VERSION is semver
    version_path = os.path.join(root, "VERSION")
    if os.path.isfile(version_path):
        v = open(version_path).read().strip()
        if not SEMVER.match(v):
            rep.error("VERSION", 1, f"`{v}` is not valid semver (expected e.g. 0.3.0)")
    else:
        rep.error("VERSION", 1, "VERSION file is missing")

    print(f"\n{checked} files checked — {rep.errors} error(s), {rep.warnings} warning(s)")
    sys.exit(1 if rep.errors else 0)


if __name__ == "__main__":
    main()
