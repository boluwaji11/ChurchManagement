import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getForm, listSubmissions, countSubmissions, listCustomFields,
  canManageChurch,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { longDate } from "@/lib/dates";
import { Builder } from "./builder";

export const dynamic = "force-dynamic";

/** Twenty to a page, the same as the directory. */
const PER_PAGE = 20;

/**
 * R4.1, R4.4. One form: its questions, and what members sent in.
 *
 * Two views behind one switch, the same pair Serving uses, because a form is
 * one thing that is written and then read.
 */
export default async function FormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string; view?: string; page?: string }>;
}) {
  const { id } = await params;
  const { church, view, page } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session)) redirect(`/?church=${session.tenantSlug}`);

  const reading = view === "responses";
  const at = Math.max(1, Number(page) || 1);

  const result = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => {
      // Found by its readable address or by its id, so everything after this
      // works from the record's own id rather than from what was in the URL.
      const form = await getForm(tx, id);
      return {
      form,
      responses: reading && form
        ? await listSubmissions(tx, form.id, { limit: PER_PAGE, offset: (at - 1) * PER_PAGE })
        : [],
      total: reading && form ? await countSubmissions(tx, form.id) : 0,
      // R4.4. The church's own person fields, so a question can be told to
      // write its answer onto one.
      personFields: await listCustomFields(tx, "person"),
      };
    },
  );
  if (!result.form) notFound();

  // The bucket is private, so the cover is served through a signed link.
  let coverUrl: string | null = null;
  if (result.form.coverKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage
      .from("church")
      .createSignedUrl(result.form.coverKey, 3600);
    coverUrl = signed.data?.signedUrl ?? null;
  }

  return (
    /* No title and no New form here: the back link below says where this is,
       and a second way to start a different form is noise on the screen where
       one is being written. */
    <AppShell session={session}>
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
        page={at}
        perPage={PER_PAGE}
        total={result.total}
        personFields={result.personFields.map((one) => ({ id: one.id, label: one.label }))}
        coverUrl={coverUrl}
      />
    </AppShell>
  );
}
