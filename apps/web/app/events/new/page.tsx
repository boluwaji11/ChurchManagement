import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { withTenant, listForms, canManageEvents } from "@hearth/db";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { EventEditor } from "../event-editor";

export const dynamic = "force-dynamic";

/** R14.1. A new event, on the page it will be read on. */
export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (!canManageEvents(session)) redirect(`/?church=${session.tenantSlug}`);

  const forms = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    (tx) => listForms(tx),
  );

  return (
    <AppShell session={session}>
      <Link
        href={`/events?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("event.title")}
      </Link>

      <EventEditor
        church={session.tenantSlug}
        forms={forms.map((one) => ({ id: one.id, name: one.name }))}
      />
    </AppShell>
  );
}
