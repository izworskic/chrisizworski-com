#!/usr/bin/env python3
"""Build the hub search lexicon and audit corpus.

Reads   data/hub-search/lexicon.json (curated synonyms and season words)
Writes  public/assets/hub-search-lexicon.js   (lexicon lines for the engine)
        data/hub-search/corpus.json            (cards extracted from each hub page)

The corpus mirrors the field adapters in public/assets/hub-search.js so the
Rust and JavaScript engines can be tested against the real directory pages.

    python3 scripts/build-hub-search.py          # regenerate
    python3 scripts/build-hub-search.py --check  # fail if generated files are stale
"""
from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEXICON_SRC = ROOT / "data/hub-search/lexicon.json"
LEXICON_OUT = ROOT / "public/assets/hub-search-lexicon.js"
CORPUS_OUT = ROOT / "data/hub-search/corpus.json"
PAGES = {
    "national": "public/synced-national-tools/index.html",
    "tools": "public/tools/index.html",
    "garden": "public/michigan-gardening/index.html",
}
STOPWORDS = {"a", "an", "and", "are", "at", "be", "best", "by", "can", "do", "does", "for", "from", "good",
             "how", "i", "in", "is", "it", "me", "my", "near", "of", "on", "or", "should", "the", "this",
             "to", "what", "when", "where", "which", "will", "with", "you", "your", "find", "get", "go", "about"}
WORD = re.compile(r"^[a-z0-9]+$")
MONTH = re.compile(r"^m(1[0-2]|[1-9])$")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.children, self.parent = tag, dict(attrs), [], parent

    def classes(self):
        return (self.attrs.get("class") or "").split()

    def text(self, skip=None):
        out = []
        for child in self.children:
            if isinstance(child, str):
                out.append(child)
            elif not (skip and skip(child)) and child.tag not in ("script", "style"):
                out.append(child.text(skip))
        return "".join(out)

    def walk(self):
        for child in self.children:
            if isinstance(child, Node):
                yield child
                yield from child.walk()

    def find(self, pred):
        return next((n for n in self.walk() if pred(n)), None)

    def closest(self, pred):
        node = self.parent
        while node is not None:
            if pred(node):
                return node
            node = node.parent
        return None


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", {}, None)
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        node = self.cur
        while node is not None and node.tag != tag:
            node = node.parent
        if node is not None and node.parent is not None:
            self.cur = node.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def squash(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def has_class(name):
    return lambda n: name in n.classes()


def href_of(node):
    if node.tag == "a":
        return node.attrs.get("href", "")
    link = node.find(lambda n: n.tag == "a" and n.attrs.get("href"))
    return link.attrs.get("href", "") if link else ""


def extract(page: str, html: str):
    builder = TreeBuilder()
    builder.feed(html)
    root = builder.root
    docs = []
    if page == "national":
        for card in root.walk():
            if card.tag != "article" or "data-search-card" not in card.attrs:
                continue
            pick = lambda pred: squash(card.find(pred).text()) if card.find(pred) else ""
            docs.append({
                "id": card.attrs.get("data-tool-id", ""),
                "title": pick(lambda n: n.tag == "h3"),
                "tags": card.attrs.get("data-tags", ""),
                "place": pick(has_class("place")),
                "kind": pick(has_class("kind")),
                "description": pick(has_class("description")),
                "months": card.attrs.get("data-months", ""),
                "href": href_of(card),
            })
    elif page == "tools":
        for card in root.walk():
            if "tool-card" not in card.classes() or "data-tags" not in card.attrs:
                continue
            kind = card.find(has_class("tk"))
            title = card.find(has_class("tool-title"))
            desc = card.find(has_class("tool-desc"))
            docs.append({
                "id": card.attrs.get("data-tool-id", ""),
                "title": squash(title.text()) if title else "",
                "tags": card.attrs.get("data-tags", ""),
                "place": "",
                "kind": squash(kind.text(skip=has_class("tk-season"))) if kind else "",
                "description": squash(desc.text()) if desc else "",
                "months": card.attrs.get("data-months", ""),
                "href": href_of(title or card),
            })
    elif page == "garden":
        for link in root.walk():
            if link.tag != "a" or "data-garden-result" not in link.attrs:
                continue
            strong = link.find(lambda n: n.tag == "strong")
            span = link.find(lambda n: n.tag == "span")
            section = link.closest(lambda n: "data-garden-category" in n.attrs)
            heading = section.find(lambda n: n.tag in ("h2", "h3")) if section else None
            docs.append({
                "id": link.attrs.get("href", ""),
                "title": squash(strong.text()) if strong else squash(link.text()),
                "tags": link.attrs.get("data-terms", ""),
                "place": "",
                "kind": squash(heading.text()) if heading else "",
                "description": squash(span.text()) if span else "",
                "months": "",
                "href": link.attrs.get("href", ""),
            })
    return docs


def validate_lexicon(src: dict) -> list[tuple[str, list[str]]]:
    errors, entries, seen = [], {}, {}
    for group in src.get("groups", []):
        if len(group) < 2:
            errors.append(f"group needs two or more words: {group}")
        for word in group:
            if not WORD.match(word):
                errors.append(f"group word must be one lowercase word: {word!r}")
            if word in STOPWORDS:
                errors.append(f"group word is a stopword and would never match: {word!r}")
            if word in seen:
                errors.append(f"{word!r} is in two groups: {seen[word]} and {group}")
            seen[word] = group
        for word in group:
            entries.setdefault(word, [])
            entries[word] += [w for w in group if w != word and w not in entries[word]]
    for key, alts in src.get("expand", {}).items():
        if not WORD.match(key) or key in STOPWORDS:
            errors.append(f"expand key must be one non-stopword: {key!r}")
        for alt in alts:
            if not (WORD.match(alt) or MONTH.match(alt)):
                errors.append(f"expand alternative must be one word or m1..m12: {alt!r}")
        entries.setdefault(key, [])
        entries[key] += [a for a in alts if a != key and a not in entries[key]]
    if errors:
        raise SystemExit("Hub search lexicon errors:\n  " + "\n  ".join(errors))
    return sorted((k, v) for k, v in entries.items() if v)


def render_lexicon(entries) -> str:
    lines = ["L\t" + "\t".join([key, *alts]) for key, alts in entries]
    body = json.dumps("\n".join(lines), ensure_ascii=False)
    return ("/* Generated by scripts/build-hub-search.py from data/hub-search/lexicon.json. Do not edit. */\n"
            f"window.HubSearchLexicon={body};\n")


def audit(src: dict, corpus) -> list[str]:
    vocab = set()
    for docs in corpus.values():
        for d in docs:
            for field in ("title", "tags", "place", "kind", "description"):
                vocab.update(re.findall(r"[a-z0-9]+", d[field].lower()))
    used = lambda word: any(v.startswith(word[:5]) for v in vocab)
    notes = []
    for group in src.get("groups", []):
        if not any(used(w) for w in group):
            notes.append(f"lexicon group {group} matches no word on any card")
    for key, alts in src.get("expand", {}).items():
        words = [a for a in alts if not MONTH.match(a)]
        if words and not any(used(a) for a in words):
            notes.append(f"lexicon {key!r} -> {words} matches no word on any card")
    for page, docs in corpus.items():
        for d in docs:
            if not d["title"]:
                notes.append(f"{page}: card {d['id'] or d['href']!r} has no title text")
    return notes


def main() -> int:
    check = "--check" in sys.argv
    src = json.loads(LEXICON_SRC.read_text(encoding="utf8"))
    entries = validate_lexicon(src)
    lexicon_js = render_lexicon(entries)
    corpus = {page: extract(page, (ROOT / rel).read_text(encoding="utf8")) for page, rel in PAGES.items()}
    for page, docs in corpus.items():
        if not docs:
            raise SystemExit(f"Hub search: no searchable cards found on {page} ({PAGES[page]})")
    corpus_json = json.dumps(corpus, ensure_ascii=False, indent=1) + "\n"
    notes = audit(src, corpus)
    if check:
        stale = [str(p.relative_to(ROOT)) for p, text in ((LEXICON_OUT, lexicon_js), (CORPUS_OUT, corpus_json))
                 if not p.exists() or p.read_text(encoding="utf8") != text]
        if stale:
            print("Hub search generated files are stale: " + ", ".join(stale))
            print("Run: python3 scripts/build-hub-search.py")
            return 1
        print(f"Hub search lexicon and corpus are current ({len(entries)} lexicon keys, "
              + ", ".join(f"{p} {len(d)}" for p, d in corpus.items()) + " cards).")
    else:
        LEXICON_OUT.write_text(lexicon_js, encoding="utf8")
        CORPUS_OUT.write_text(corpus_json, encoding="utf8")
        print(f"Wrote {LEXICON_OUT.relative_to(ROOT)} ({len(entries)} keys) and {CORPUS_OUT.relative_to(ROOT)} ("
              + ", ".join(f"{p} {len(d)}" for p, d in corpus.items()) + " cards).")
    for note in notes:
        print("note:", note)
    return 0


if __name__ == "__main__":
    sys.exit(main())
