import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { withTenant, getChurch, listForms, canManageEvents } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { churchNow } from "@/lib/church-now";
import { EventEditor } from "../event-editor";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("nav.events"), church);
}

/** R14.1. A new event, on the page it will be read on. */
export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (!canManageEvents(session)) {
    return (
      <Denied role={session.role} action="manageEvents" church={session.tenantSlug} />
      
    );
  }

  const forms = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => ({
      forms: await listForms(tx),
      // The church's own date, so a picker's floor is its today rather than
      // the server's or the reader's.
      today: churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date,
    }),
  );

  return (
    <AppShell session={session} tab={t("nav.events")}>
      <Link
        href={`/events?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("event.title")}
      </Link>

      <EventEditor
        church={session.tenantSlug}
        forms={forms.forms.map((one) => ({ id: one.id, name: one.name }))}
        today={forms.today}
      />
    </AppShell>
  );
}
