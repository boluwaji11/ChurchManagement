import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { withTenant, getForm, listSubmissions, canManageChurch } from "@hearth/db";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { longDate } from "@/lib/dates";
import { NewFormButton } from "../new-form";
import { Builder } from "./builder";

export const dynamic = "force-dynamic";

/**
 * R4.1, R4.4. One form: its questions, and what people sent in.
 *
 * Two views behind one switch, the same pair Serving uses, because a form is
 * one thing that is written and then read.
 */
export default async function FormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string; view?: string }>;
}) {
  const { id } = await params;
  const { church, view } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session.role)) redirect(`/?church=${session.tenantSlug}`);

  const reading = view === "responses";

  const result = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    async (tx) => ({
      form: await getForm(tx, id),
      responses: reading ? await listSubmissions(tx, id) : [],
    }),
  );
  if (!result.form) notFound();

  return (
    <AppShell
      session={session}
      title={t("form.title")}
      action={<NewFormButton church={session.tenantSlug} />}
    >
      <Link
        href={`/forms?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("form.title")}
      </Link>

      <Builder
        church={session.tenantSlug}
        form={result.form}
        view={reading ? "responses" : "questions"}
        responses={result.responses.map((one) => ({
          ...one,
          when: longDate(one.receivedAt.slice(0, 10)),
        }))}
      />
    </AppShell>
  );
}
