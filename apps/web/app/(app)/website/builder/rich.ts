"use client";

/**
 * HRT-378, R22.2. Reading words back out of the canvas.
 *
 * Somebody types into a heading or a paragraph on the page itself, so what they
 * typed has to come back as the document's own shape rather than as a string of
 * markup. This walks what the browser left behind and keeps the three things a
 * church can apply: bold, italic and a link.
 *
 * Nothing else survives the walk. A paste carrying a font, a colour, a table or
 * a script arrives as its text and leaves as its text, which is the whole of
 * the sanitising story: there is no list of tags to strip, because nothing is
 * read except text nodes and the three states above.
 */

import type { LinkTarget, Rich, Run } from "@connectapp/db/rules";

interface Marks {
  b: boolean;
  i: boolean;
  href: LinkTarget | undefined;
}

const BOLD = new Set(["B", "STRONG"]);
const ITALIC = new Set(["I", "EM"]);
/** What the browser leaves behind when a line is broken inside a paragraph. */
const BREAKS = new Set(["BR", "P", "DIV", "LI"]);

function targetOf(element: Element): LinkTarget | undefined {
  const held = element.getAttribute("data-to");
  if (held) {
    try {
      const parsed = JSON.parse(held) as LinkTarget;
      if (parsed && typeof parsed === "object" && typeof parsed.kind === "string") {
        return parsed;
      }
    } catch {
      /* Somebody pasted our own markup from somewhere else. Treat it as text. */
    }
  }
  const href = element.getAttribute("href");
  if (href && /^https:\/\//i.test(href)) return { kind: "url", url: href };
  return undefined;
}

/** The runs a contentEditable element is holding. */
export function runsFrom(node: Node): Rich {
  const runs: Run[] = [];

  const push = (text: string, marks: Marks) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    const same = last
      && Boolean(last.b) === marks.b
      && Boolean(last.i) === marks.i
      && JSON.stringify(last.href ?? null) === JSON.stringify(marks.href ?? null);
    if (same && last) {
      last.t += text;
      return;
    }
    const run: Run = { t: text };
    if (marks.b) run.b = true;
    if (marks.i) run.i = true;
    if (marks.href) run.href = marks.href;
    runs.push(run);
  };

  const walk = (here: Node, marks: Marks, depth: number) => {
    if (depth > 12) return;
    for (const child of Array.from(here.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        push(child.textContent ?? "", marks);
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const element = child as Element;
      const tag = element.tagName;
      if (tag === "BR") {
        push("\n", marks);
        continue;
      }
      const style = (element as HTMLElement).style;
      const next: Marks = {
        b: marks.b || BOLD.has(tag) || Number(style?.fontWeight) >= 600,
        i: marks.i || ITALIC.has(tag) || style?.fontStyle === "italic",
        href: targetOf(element) ?? marks.href,
      };
      /* A block the browser inserted on Enter starts a new line. */
      const breaks = BREAKS.has(tag) && runs.length > 0;
      if (breaks) push("\n", marks);
      walk(element, next, depth + 1);
    }
  };

  walk(node, { b: false, i: false, href: undefined }, 0);

  /* A trailing newline from the last block the browser inserted. */
  const last = runs[runs.length - 1];
  if (last && last.t.endsWith("\n")) last.t = last.t.replace(/\n+$/, "");
  return runs.filter((run) => run.t !== "");
}

/** A single line, which takes no formatting at all. */
export function lineFrom(node: Node): string {
  return (node.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Whether a selection sits inside this element. */
export function selectionInside(element: Element): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  return element.contains(range.commonAncestorContainer);
}

/**
 * Pastes as text.
 *
 * Without this, pasting a paragraph out of Word brings its fonts, its colours
 * and its class names into the page, and the church's own theme stops being the
 * thing that decides how the page looks.
 */
export function pasteAsText(event: ClipboardEvent): void {
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") ?? "";
  if (!text) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const lines = text.split(/\r?\n/);
  const fragment = document.createDocumentFragment();
  lines.forEach((line, index) => {
    if (index > 0) fragment.append(document.createElement("br"));
    fragment.append(document.createTextNode(line));
  });
  range.insertNode(fragment);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}
