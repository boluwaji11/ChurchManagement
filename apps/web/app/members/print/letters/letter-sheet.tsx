import { merge, LETTER_FACE, faceOf, sizeOf } from "@connectapp/ui";
import type { PostalRow } from "@connectapp/db";
import { Markdown } from "@/components/markdown";

/**
 * R16.12. A letter from a church, laid out the way a letter is laid out.
 *
 * Block format, which is what every office letter has used since the
 * typewriter: everything flush left, the letterhead at the top, the date, the
 * address it is going to, then the words. A church secretary who has written
 * one before should recognise this without being told anything.
 *
 * The page's own margins are set to nothing and the margin is put on the
 * page's content instead. That is the one way to stop the browser printing
 * its own header and footer, which is how a letter from a church ends up with
 * `localhost:4488/members/print/letters?church=...` across the bottom of it.
 */
export interface LetterHead {
  church: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
}

export function LetterSheet({
  rows,
  head,
  body,
  today,
  from,
  font,
  size,
}: {
  rows: PostalRow[];
  head: LetterHead;
  body: string;
  today: string;
  from: string;
  /** R16.12. The typeface the church chose for this letter. */
  font?: string;
  /** How big it is set, in points. */
  size?: string | number;
}) {
  return (
    <>
      {rows.map((one, at) => (
        <article
          key={one.householdId}
          className={at === rows.length - 1 ? "" : "break-after-page"}
          /* 25mm all round, which is what a letter is typed in and what a
             window envelope expects to find the address behind. */
          style={{
            padding: "25mm 25mm 20mm",
            minHeight: "297mm",
            fontFamily: LETTER_FACE[faceOf(font)].css,
          }}
        >
          {/* The letterhead. The mark first, then the church, then the ways
              to answer it, which is the order a reader's eye takes them. */}
          <header className="mb-[14mm] flex items-start gap-4 border-b border-black/15 pb-[6mm]">
            {head.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={head.logoUrl}
                alt=""
                aria-hidden
                className="h-[18mm] w-[18mm] shrink-0 object-contain"
              />
            ) : null}

            <span className="flex min-w-0 flex-col leading-[1.35]">
              <span className="text-[14pt] font-bold tracking-[0.01em]">{head.church}</span>
              {head.address ? <span className="text-[9.5pt]">{head.address}</span> : null}
              {head.phone || head.email ? (
                <span className="text-[9.5pt]">
                  {[head.phone, head.email].filter(Boolean).join("  ·  ")}
                </span>
              ) : null}
            </span>
          </header>

          {/* R16.12. Who it is going to on the right, where a window envelope
              shows it, and the date under it on the left. */}
          <div className="mb-[8mm] flex justify-end text-[11pt] leading-[1.45]">
            <div className="text-left">
              {/* The name leads, the way an envelope is addressed. */}
              <p className="m-0 font-semibold">{one.name}</p>
              {one.lines.map((line) => <p key={line} className="m-0">{line}</p>)}
            </div>
          </div>

          <p className="m-0 mb-[10mm] text-[11pt]">{today}</p>

          {/* The words, as the writer laid them out. */}
          <div
            className="leading-[1.65] [&_p]:mb-[4mm]"
            style={{ fontSize: `${sizeOf(size)}pt` }}
          >
            <Markdown
              text={merge(body, {
                first: one.first,
                name: one.name,
                address: one.lines.join(", "),
                church: head.church,
                today,
                from,
                phone: head.phone ?? "",
                email: head.email ?? "",
                website: head.website ?? "",
              })}
            />
          </div>
        </article>
      ))}
    </>
  );
}
