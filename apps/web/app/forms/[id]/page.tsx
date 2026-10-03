import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { withTenant, getForm, canManageChurch } from "@hearth/db";
import { t } from "@hearth/i18n";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { Builder } from "./builder";

export const dynamic = "force-dynamic";

/** R4.1. Building one form: its words, its questions, and how it will read. */
export default async function FormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session.role)) redirect(`/?church=${session.tenantSlug}`);

  const form = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    (tx) => getForm(tx, id),
  );
  if (!form) notFound();

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/forms?church=${session.tenantSlug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> {t("form.title")}
        </Link>

        <Builder church={session.tenantSlug} form={form} />
      </main>
    </>
  );
}
