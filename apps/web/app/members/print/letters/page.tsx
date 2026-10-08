import { redirect } from "next/navigation";
import {
  withTenant, postalRows, resolveList, listPeople, getChurch, canEditPeople,
} from "@connectapp/db";
import { merge } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { longDate } from "@/lib/dates";
import { AutoPrint } from "../../../checkin/rooms/print/auto-print";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R16.12. How many letters one run will print. */
const CAP = 500;

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("letter.title"), church);
}

/**
 * R16.12. A letter a church posts, one page a household.
 *
 * The thing a volunteer does in Word once a year, which means keeping the
 * church's address list in two places and finding out in January that one of
 * them is a year out of date.
 *
 * The letter is typed once and the marks in it become each household's own
 * words. A page break between them, so what comes out of the printer is a
 * stack that goes straight into envelopes.
 */
export default async function PrintLettersPage({
  searchParams,
}: {
  searchParams: Promise<{
    church?: string; list?: string; ids?: string; each?: string; body?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await requireSession(params.church);

  /* A sheet with no shell around it, so a refusal has nowhere to sit. */
  if (!canEditPeople(session)) {
    redirect(`/members?church=${session.tenantSlug}`);
  }

  const read = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const each = params.each === "person" ? "person" : "household";

      const rows = params.ids
        ? await postalRows(tx, {
            memberIds: params.ids.split(",").filter(Boolean).slice(0, 40),
            each,
          })
        : params.list
          ? await (async () => {
              const held = await resolveList(tx, params.list!);
              if (!held) return [];
              const ids = held.kind === "static"
                ? held.ids ?? []
                : (await listPeople(tx, { ...(held.rule ?? {}) } as never)).map((one) => one.id);
              return postalRows(tx, { memberIds: ids, each });
            })()
          : await postalRows(tx, { each });

      return { profile, rows: rows.slice(0, CAP) };
    },
  );

  const today = churchNow(read.profile?.timezone ?? "America/Chicago").date;
  const body = params.body ?? "";

  const where = [
    read.profile?.addressLine1,
    read.profile?.city,
    [read.profile?.region, read.profile?.postalCode].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");

  return (
    <main className="min-h-dvh bg-white text-black">
      <AutoPrint />
      <style>{"@page { size: auto; margin: 18mm 20mm; }"}</style>

      {read.rows.length === 0 ? (
        <p className="px-10 py-9 text-[13pt]">{t("post.none")}</p>
      ) : null}

      {read.rows.map((one, at) => (
        <article
          key={one.householdId}
          className={at === read.rows.length - 1 ? "" : "break-after-page"}
        >
          {/* The church's own name and address at the head, the way a letter
              from an office is written. */}
          <header className="mb-10">
            <p className="m-0 text-[13pt] font-semibold">{session.tenantName}</p>
            {where ? <p className="m-0 text-[10pt]">{where}</p> : null}
          </header>

          {/* Who it is to, where a window envelope shows it. */}
          <div className="mb-8 text-[11pt] leading-[1.45]">
            <p className="m-0 font-semibold">{one.name}</p>
            {one.lines.map((line) => <p key={line} className="m-0">{line}</p>)}
          </div>

          <p className="mb-8 text-[11pt]">{longDate(today)}</p>

          {/* R16.12. The letter itself, with this household's own words in
              place of the marks. The lines a church typed are the lines it
              gets: a letter is not markdown and a blank line is a paragraph. */}
          <div className="whitespace-pre-wrap text-[11pt] leading-[1.6]">
            {merge(body, {
              name: one.name,
              address: one.lines.join(", "),
              church: session.tenantName,
              date: longDate(today),
              today: longDate(today),
              from: session.displayName,
            })}
          </div>
        </article>
      ))}
    </main>
  );
}
