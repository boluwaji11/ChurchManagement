/**
 * R9.2. Between what somebody types and what we keep.
 *
 * The editor is a contenteditable box, so the browser hands back HTML. We do
 * not store that: it is turned into the small markdown the renderer already
 * understands, and read back the same way. Keeping markdown means nothing a
 * volunteer pastes can ever become a tag on a page a member reads, and the one
 * renderer stays the only thing that decides what an element may be.
 */

/**
 * An inline mark, applied a line at a time.
 *
 * Bolding across two lines gives a <strong> with blocks inside it, and wrapping
 * the whole thing in one pair of asterisks writes markdown where the opening
 * and closing marks sit on different lines. Nothing reads that back, so the
 * asterisks appeared in the box as text. Each line carries its own pair, and
 * the spaces at either end stay outside them.
 */
function marked(text: string, wrap: string): string {
  return text
    .split("\n")
    .map((line) => {
      const parts = /^(\s*)(.*?)(\s*)$/.exec(line);
      if (!parts) return line;
      const [, left = "", body = "", right = ""] = parts;
      return body ? `${left}${wrap}${body}${wrap}${right}` : line;
    })
    .join("\n");
}

/** The HTML the editor produces, as markdown. */
export function htmlToMarkdown(root: Node): string {
  const out: string[] = [];

  const walk = (node: Node, inList: null | "ul" | "ol", index = 0): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const kids = (list: null | "ul" | "ol" = inList) =>
      Array.from(el.childNodes)
        .map((child, i) => walk(child, list, i))
        .join("");

    switch (el.tagName) {
      case "BR":
        return "\n";
      case "STRONG":
      case "B":
        return marked(kids(), "**");
      case "EM":
      case "I":
        return marked(kids(), "_");
      case "A": {
        const href = el.getAttribute("href") ?? "";
        return /^https?:\/\//i.test(href) ? `[${kids()}](${href})` : kids();
      }
      case "UL":
        return `\n${Array.from(el.children)
          .map((li) => `- ${walk(li, "ul")}`)
          .join("\n")}\n`;
      case "OL":
        return `\n${Array.from(el.children)
          .map((li, i) => `${i + 1}. ${walk(li, "ol")}`)
          .join("\n")}\n`;
      case "LI":
        return kids(null);
      case "DIV":
      case "P":
        return `${kids()}\n`;
      default:
        return kids();
    }
  };

  for (const child of Array.from(root.childNodes)) out.push(walk(child, null));

  return out
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Inline marks, as the few tags the editor works with. */
function inlineHtml(text: string): string {
  let out = escape(text);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/_([^_]+)_/g, "<em>$1</em>");
  /*
   * A mark with nothing to close it runs to the end of its line, which is what
   * somebody who bolded across a line break meant. Anything still left over is
   * dropped: a box that shows asterisks is a box that looks broken.
   */
  out = out.replace(/\*\*([^*]+)$/, "<strong>$1</strong>");
  return out.replace(/\*\*/g, "");
}

/**
 * Markdown as the HTML the editor opens with.
 *
 * Every angle bracket in the stored text is escaped before a tag is added, so
 * the only elements here are the ones this function writes.
 */
export function markdownToHtml(markdown: string): string {
  // A form posts its fields with CRLF line endings, so what comes back out of
  // storage carries them. Everything below counts in newlines.
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) {
        items.push(inlineHtml(lines[i]!.replace(/^\s*[-*]\s+/, "")));
        i += 1;
      }
      out.push(`<ul>${items.map((one) => `<li>${one}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) {
        items.push(inlineHtml(lines[i]!.replace(/^\s*\d+\.\s+/, "")));
        i += 1;
      }
      out.push(`<ol>${items.map((one) => `<li>${one}</li>`).join("")}</ol>`);
      continue;
    }

    // An empty line, or one holding nothing but marks that lost their pair.
    if (line.trim() === "" || /^[*_\s]+$/.test(line)) {
      i += 1;
      continue;
    }

    out.push(`<div>${inlineHtml(line)}</div>`);
    i += 1;
  }

  return out.join("");
}

/**
 * R9.5. The same description as one line of text.
 *
 * A card that is itself a link cannot carry the markdown rendering, because the
 * links inside it would nest. This takes the marks off and leaves the words.
 */
export function plainFromMarkdown(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/^\s{0,3}(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s?)/gm, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
