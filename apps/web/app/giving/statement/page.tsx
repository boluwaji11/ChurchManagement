import { redirect } from "next/navigation";
import { withTenant, personForUser, statementFor, getChurch } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { longDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { AutoPrint } from "@/app/checkin/rooms/print/auto-print";
import { photoUrls } from "@/lib/photos";
import { Letterhead } from "./letterhead";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("mine.giving.statement"), church);
}

/**
 * R13.19. The giver's own statement, whenever they want it.
 *
 * The same sheet the church prints, read as themselves. Nobody has to be asked
 * for it and nobody has to be emailed it.
 */
export default async function MyStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; year?: string }>;
}) {
  const { church, year: asked } = await searchParams;
  const session = await requireSession(church);

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const read = await withTenant(ctx, async (tx) => {
    const self = await personForUser(tx, session.userId);
    if (!self) return null;

    const profile = await getChurch(tx, session.tenantId);
    const here = churchNow(profile?.timezone ?? "America/Chicago").date.slice(0, 4);
    const year = /^\d{4}$/.test(asked ?? "") ? asked! : here;

    return {
      profile,
      year,
      /* R1.5. Their own record, so the permission is their own. */
      statement: await statementFor(
        tx,
        { ...ctx, permissions: [...(ctx.permissions ?? []), "giving.amounts"] },
        self,
        year,
        profile?.statementsBy === "household" ? "household" : "person",
      ),
    };
  });

  if (!read?.statement) redirect(`/giving?church=${session.tenantSlug}`);

  const { statement } = read;
  const inKind = statement.lines.filter((line) => line.inKindDescription);
  const cash = statement.lines.filter((line) => !line.inKindDescription);

  /* The bucket is private, so the mark is served through a signed link. */
  const logoKey = read.profile?.logoKey ?? null;
  const logoUrl = logoKey ? ((await photoUrls([logoKey]))[logoKey] ?? null) : null;

  const address = [
    read.profile?.addressLine1,
    read.profile?.city,
    read.profile?.region,
    read.profile?.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="mx-auto min-h-dvh max-w-3xl bg-white px-10 py-10 text-black">
      <AutoPrint />
      <style>{"@page { size: auto; margin: 0; }"}</style>

      <Letterhead
        name={read.profile?.legalName || session.tenantName}
        address={address}
        logoUrl={logoUrl}
      />

      <header className="mt-3 border-b-2 border-black pb-3">
        <h1 className="font-display text-[30px] leading-[38px]">
          {t("statement.heading", { year: read.year })}
        </h1>
        <p className="mt-1 text-[15px]">{t("statement.for", { name: statement.name })}</p>
      </header>

      <div className="mt-5">
        {cash.map((line, at) => (
          <div
            key={`${line.date}-${at}`}
            className="flex items-baseline gap-4 border-b border-neutral-200 py-2 last:border-0"
          >
            <span className="w-[140px] shrink-0 text-[14px]">{longDate(line.date)}</span>
            <span className="min-w-0 flex-1 text-[15px]">{line.fund}</span>
            <span className="w-[120px] shrink-0 text-right font-mono text-[15px]">
              {money(line.amountCents)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t-2 border-black pt-3">
        <span className="font-display text-[20px]">{t("statement.total")}</span>
        <span className="font-mono text-[22px] font-semibold">{money(statement.totalCents)}</span>
      </div>

      {inKind.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-[13px] font-semibold tracking-[0.06em] uppercase">
            {t("statement.inKind")}
          </h2>
          {inKind.map((line, at) => (
            <div
              key={`${line.date}-kind-${at}`}
              className="flex items-baseline gap-4 border-b border-neutral-200 py-2 last:border-0"
            >
              <span className="w-[140px] shrink-0 text-[14px]">{longDate(line.date)}</span>
              <span className="min-w-0 flex-1 text-[15px]">{line.inKindDescription}</span>
            </div>
          ))}
          <p className="mt-2 text-[13px] text-neutral-600">{t("statement.inKind.note")}</p>
        </div>
      ) : null}

      <p className="mt-8 text-[14px]">{t("statement.goods")}</p>
      {statement.needsAcknowledgment ? (
        <p className="mt-2 text-[14px]">{t("statement.ack")}</p>
      ) : null}
    </main>
  );
}
