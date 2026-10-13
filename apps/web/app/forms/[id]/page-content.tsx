import { notFound } from "next/navigation";
import {
  withTenant, getForm, listSubmissions, countSubmissions, listCustomFields,
  canManageChurch,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { RecordPanel } from "@/components/record-panel";
import { ScreenPanel } from "@/components/screen-panel";
import { returnToList } from "@/lib/return-to";
import { requireSession } from "@/lib/session";
import { publicLink } from "@/lib/church-address";
import { Denied } from "@/components/denied";
import { supabaseServer } from "@/lib/supabase/server";
import { longDate } from "@/lib/dates";
import { Builder } from "./builder";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says until the record names itself. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("form.title"));
}

/** Twenty to a page, the same as the directory. */
const PER_PAGE = 20;

/**
 * R4.1, R4.4. One form: its questions, and what members sent in.
 *
 * Two views behind one switch, the same pair Serving uses, because a form is
 * one thing that is written and then read.
 */
export async function FormPanelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; page?: string; returnTo?: string }>;
}) {
  const { id } = await params;
  const { view, page, returnTo } = await searchParams;
  const session = await requireSession();
  const closeTo = returnToList(returnTo, "/forms");

  if (!canManageChurch(session)) {
    return (
      <ScreenPanel title={t("form.title")} closeTo={closeTo}>
        <Denied role={session.role} action="manageForms" church={session.tenantSlug} />
      </ScreenPanel>
    );
  }

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

  /*
   * R4.1, R24.6. The two halves of a form down the rail. Each is read from the
   * database rather than held in the window, so the rail navigates: a page of
   * responses is a page of responses.
   */
  const here = `/forms/${result.form.slug}`;
  const back = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
  const sections = [
    { id: "questions", label: t("form.view.questions"), href: `${here}?${back.slice(1)}` },
    { id: "responses", label: t("form.view.responses"), href: `${here}?view=responses${back}` },
  ];

  return (
    <RecordPanel
      title={result.form.name}
      sections={sections}
      showing={reading ? "responses" : "questions"}
      closeTo={closeTo}
      width="1040px"
    >
      <Builder
        church={session.tenantSlug}
        /* R4.3, R17.1. The link and the frame, built where the request is, so
           what a church copies is what the public routes answer on. */
        publicLink={await publicLink(session.tenantSlug, "f", `/${result.form.slug}`)}
        embedLink={await publicLink(session.tenantSlug, "f", `/${result.form.slug}/embed`)}
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
    </RecordPanel>
  );
}
