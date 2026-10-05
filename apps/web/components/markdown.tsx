import * as React from "react";

/**
 * R9.2. The small markdown a description is allowed to use, drawn.
 *
 * Written by hand rather than pulled in, for one reason: it never produces an
 * element it was not asked for. The input is a volunteer's typing on a page any
 * member can read, so the renderer walks the text and builds React nodes.
 * Nothing is ever passed to dangerouslySetInnerHTML, so there is no tag, no
 * attribute and no URL scheme that can get through it.
 */

/** Bold, italic and links, inside one line. */
function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // The order matters: ** before _, so "**a_b**" is bold rather than half italic.
  const pattern = /(\*\*([^*]+)\*\*)|(_([^_]+)_)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

  let at = 0;
  let n = 0;
  for (const m of text.matchAll(pattern)) {
    const start = m.index!;
    if (start > at) out.push(text.slice(at, start));

    if (m[2] !== undefined) {
      out.push(<strong key={`${key}b${n}`} className="font-semibold">{m[2]}</strong>);
    } else if (m[4] !== undefined) {
      out.push(<em key={`${key}i${n}`}>{m[4]}</em>);
    } else if (m[6] !== undefined) {
      const href = m[7]!;
      // Only the two schemes a church link is ever written in. Anything else,
      // javascript: among them, is drawn as the words it was typed as.
      const safe = /^https?:\/\//i.test(href);
      out.push(
        safe ? (
          <a
            key={`${key}l${n}`}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary underline underline-offset-4"
          >
            {m[6]}
          </a>
        ) : (
          m[6]
        ),
      );
    }

    at = start + m[0].length;
    n += 1;
  }

  if (at < text.length) out.push(text.slice(at));
  return out;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*[-*]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={`u${i}`} className="list-disc pl-5">
          {items.map((item, n) => <li key={n}>{inline(item, `u${i}-${n}`)}</li>)}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={`o${i}`} className="list-decimal pl-5">
          {items.map((item, n) => <li key={n}>{inline(item, `o${i}-${n}`)}</li>)}
        </ol>,
      );
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== "" &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i]!)
    ) {
      paragraph.push(lines[i]!);
      i += 1;
    }
    blocks.push(<p key={`p${i}`}>{inline(paragraph.join(" "), `p${i}`)}</p>);
  }

  return <div className={className}>{blocks}</div>;
}
