import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getBatch, listGifts, listFunds, canManageGiving,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { CountScreen } from "./count-screen";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("giving.title"), church);
}

/**
 * R13.10 to R13.12. One counting session.
 *
 * The declared total sits over the running total of what has been entered, so
 * the two numbers a counter is reconciling are never more than a glance apart.
 */
export default async function CountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageGiving(session)) {
    return (
      <Denied role={session.role} action="manageGiving" church={session.tenantSlug} />
      
    );
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const read = await withTenant(ctx, async (tx) => ({
    count: await getBatch(tx, id),
    lines: await listGifts(tx, ctx, { batchId: id, limit: 500 }),
    funds: await listFunds(tx),
  }));

  if (!read.count) notFound();

  return (
    <AppShell session={session} title={read.count.name} wide>
      <div className="flex flex-col gap-5">
        <Link
          href={`/giving?church=${session.tenantSlug}`}
          className="flex w-fit items-center gap-1.5 font-medium text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden /> {t("giving.count.back")}
        </Link>

        <CountScreen
          church={session.tenantSlug}
          count={read.count}
          lines={read.lines.map((one) => ({
            id: one.id,
            giver: one.memberName,
            fund: one.fundName,
            method: one.method,
            reference: one.reference,
            amountCents: one.amountCents,
            inKind: one.inKindDescription,
          }))}
          funds={read.funds.map((one) => ({ id: one.id, name: one.name }))}
        />
      </div>
    </AppShell>
  );
}
