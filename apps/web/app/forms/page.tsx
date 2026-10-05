import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { withTenant, listForms, countArchivedForms, canManageChurch } from "@hearth/db";
import { LIFT } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Empty } from "@/components/empty";
import { NewFormButton } from "./new-form";
import { FormSearch } from "./form-search";

export const dynamic = "force-dynamic";

/**
 * R4.1. The forms a church has built.
 *
 * Built to docs/redesign/design: a tile per form, the name in Fraunces, and
 * under it the two numbers somebody opening this screen came for. Whether it is
 * taking answers, and how many it has.
 *
 * A form that has been put away comes off this grid and sits behind the one
 * link under it, which is also the way back to bringing it out again.
 */
export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const { church, archived } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session)) redirect(`/?church=${session.tenantSlug}`);

  const putAway = archived === "1";

  const { forms, archivedCount } = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => ({
      forms: await listForms(tx, putAway ? { archivedOnly: true } : {}),
      archivedCount: await countArchivedForms(tx),
    }),
  );

  return (
    <AppShell
      session={session}
      title={t("form.title")}
      /* No action in the band above: it shares a line with the search, and on
         an empty screen it sits in the empty state where the eye already is. */
    >
      {putAway ? (
        <Link
          href={`/forms?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("form.archived.back")}
        </Link>
      ) : null}

      {forms.length === 0 ? (
        <Empty
          icon="form"
          title={putAway ? t("form.archived.none") : t("form.empty")}
          action={putAway ? undefined : <NewFormButton church={session.tenantSlug} />}
        />
      ) : (
        <FormSearch
          names={forms.map((one) => one.name)}
          count={forms.length}
          action={putAway ? undefined : <NewFormButton church={session.tenantSlug} />}
        >
          {forms.map((form) => {
            const open = !form.archivedAt && form.status === "open";
            return (
              <li key={form.id} className="contents">
                <Link
                  href={`/forms/${form.slug}?church=${session.tenantSlug}`}
                  className={`flex cursor-pointer flex-col gap-2.5 overflow-hidden rounded-[14px] border border-line bg-surface p-5 ${LIFT}`}
                >
                  {/* R24.4. The form's own colour across the top of its tile,
                      so the grid reads as a set of things rather than a list of
                      names. */}
                  <span
                    aria-hidden
                    className="-mx-5 -mt-5 mb-0.5 h-1.5 w-[calc(100%+2.5rem)]"
                    style={{ background: `var(--hue-${form.hue}-500)` }}
                  />
                  <span className="font-display text-[22px] leading-7 text-fg">{form.name}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[12px] font-medium${
                        open ? "" : " bg-sunken text-fg-muted"
                      }`}
                      style={
                        open
                          ? { background: "var(--hue-fern-tint)", color: "var(--hue-fern-key)" }
                          : undefined
                      }
                    >
                      {form.archivedAt
                        ? t("form.status.archived")
                        : t(`form.status.${form.status}` as never)}
                    </span>
                    <span className="text-[12px] text-fg-subtle tabular-nums">
                      {plural("form.questions", form.questions)}
                      {" · "}
                      {plural("form.responses", form.responses)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </FormSearch>
      )}

      {!putAway && archivedCount > 0 ? (
        <Link
          href={`/forms?church=${session.tenantSlug}&archived=1`}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("form.archived", archivedCount)}
        </Link>
      ) : null}
    </AppShell>
  );
}
