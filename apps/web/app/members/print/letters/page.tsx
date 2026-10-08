import { redirect } from "next/navigation";
import {
  withTenant, postalRows, resolveList, listPeople, getChurch, canEditPeople,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { longDate } from "@/lib/dates";
import { AutoPrint } from "../../../checkin/rooms/print/auto-print";
import { tabMetadata } from "@/lib/page-metadata";
import { supabaseServer } from "@/lib/supabase/server";
import { LetterSheet } from "./letter-sheet";

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
  return tabMetadata(t("post.tab.letters"), church);
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

  /* The bucket is private, so the church's mark is served through a signed
     link the browser can read for the minute it takes to print. */
  const logoUrl = await (async () => {
    if (!read.profile?.logoKey) return null;
    const supabase = await supabaseServer();
    const signed = await supabase.storage
      .from("church")
      .createSignedUrl(read.profile.logoKey, 3600);
    return signed.data?.signedUrl ?? null;
  })();

  const today = longDate(churchNow(read.profile?.timezone ?? "America/Chicago").date);

  const where = [
    read.profile?.addressLine1,
    read.profile?.addressLine2,
    read.profile?.city,
    [read.profile?.region, read.profile?.postalCode].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ") || null;

  return (
    <main className="min-h-dvh bg-white text-black">
      <AutoPrint />
      {/* Nothing in the page's own margin, so the browser prints no header and
          no footer of its own: a letter from a church with an address bar
          across the bottom of it is not a letter anybody posts. The margin is
          on each letter instead. */}
      <style>{"@page { size: auto; margin: 0; }"}</style>

      {read.rows.length === 0 ? (
        <p className="px-10 py-9 text-[13pt]">{t("post.none")}</p>
      ) : (
        <LetterSheet
          rows={read.rows}
          body={params.body ?? ""}
          today={today}
          from={session.displayName}
          head={{
            church: session.tenantName,
            address: where,
            phone: read.profile?.phone ?? null,
            email: read.profile?.email ?? null,
            logoUrl,
          }}
        />
      )}
    </main>
  );
}
