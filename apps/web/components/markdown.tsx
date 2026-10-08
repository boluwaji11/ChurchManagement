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
function inline(text: string, key: string, flat = false): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // The order matters: ** before _, so "**a_b**" is bold rather than half italic.
  const pattern = /(\*\*([^*]+)\*\*)|(_([^_]+)_)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

  let at = 0;
  let n = 0;
  for (const m of text.matchAll(pattern)) {
    const start = m.index!;
    if (start > at) out.push(text.slice(at, start));

    /*
     * Each mark's contents go through this again, so a link inside a bold and a
     * bold inside a link both draw as what they are. Reading one level deep
     * left the other level's asterisks on the page as text.
     */
    if (m[2] !== undefined) {
      out.push(
        <strong key={`${key}b${n}`} className="font-semibold">
          {inline(m[2], `${key}b${n}`, flat)}
        </strong>,
      );
    } else if (m[4] !== undefined) {
      out.push(<em key={`${key}i${n}`}>{inline(m[4], `${key}i${n}`, flat)}</em>);
    } else if (m[6] !== undefined) {
      const href = m[7]!;
      // Only the two schemes a church link is ever written in. Anything else,
      // javascript: among them, is drawn as the words it was typed as.
      // R9.5. A description drawn inside a card that is itself a link cannot
      // carry one of its own, so there the words are drawn without it.
      const safe = !flat && /^https?:\/\//i.test(href);
      out.push(
        safe ? (
          <a
            key={`${key}l${n}`}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary underline underline-offset-4"
          >
            {inline(m[6], `${key}l${n}`, flat)}
          </a>
        ) : (
          inline(m[6], `${key}l${n}`, flat)
        ),
      );
    }

    at = start + m[0].length;
    n += 1;
  }

  if (at < text.length) out.push(text.slice(at));
  return out;
}

export function Markdown({
  text,
  className,
  flat,
}: {
  text: string;
  className?: string;
  /** Drawn inside something that is already a link, so it carries none itself. */
  flat?: boolean;
}) {
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
          {items.map((item, n) => <li key={n}>{inline(item, `u${i}-${n}`, flat)}</li>)}
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
          {items.map((item, n) => <li key={n}>{inline(item, `o${i}-${n}`, flat)}</li>)}
        </ol>,
      );
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    /* R16.12. A run of lines somebody set in, set in. */
    if (line.startsWith("\t")) {
      const inside: string[] = [];
      while (i < lines.length && lines[i]!.startsWith("\t")) {
        inside.push(lines[i]!.slice(1));
        i += 1;
      }
      blocks.push(
        <div key={`q${i}`} className="pl-8">
          {inside.map((one, n) => (
            <React.Fragment key={n}>
              {n > 0 ? <br /> : null}
              {inline(one, `q${i}-${n}`, flat)}
            </React.Fragment>
          ))}
        </div>,
      );
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
    /*
     * R9.2, R16.12. A line break is a line break.
     *
     * Markdown's own rule joins consecutive lines into one, which is right
     * for somebody writing markdown in a text file and wrong for everybody
     * who writes in this product: they type into a box that shows them the
     * lines they made, and a letter that reads back as one run-on paragraph
     * is a letter they did not write.
     */
    blocks.push(
      <p key={`p${i}`}>
        {paragraph.map((one, n) => (
          <React.Fragment key={n}>
            {n > 0 ? <br /> : null}
            {inline(one, `p${i}-${n}`, flat)}
          </React.Fragment>
        ))}
      </p>,
    );
  }

  return <div className={className}>{blocks}</div>;
}
