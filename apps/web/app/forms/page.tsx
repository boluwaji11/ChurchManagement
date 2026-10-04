import Link from "next/link";
import { redirect } from "next/navigation";
import { withTenant, listForms, canManageChurch } from "@hearth/db";
import { Badge, Card, EmptyState } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { NewFormButton } from "./new-form";

export const dynamic = "force-dynamic";

/**
 * R4.1. The forms a church has built.
 *
 * A form is how a church gets data in without anybody typing it twice, so the
 * list says the one thing somebody checks: whether each is open, and how much
 * it asks.
 */
export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session.role)) redirect(`/?church=${session.tenantSlug}`);

  const forms = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    (tx) => listForms(tx),
  );

  return (
    <AppShell
      session={session}
      title={t("form.title")}
      action={<NewFormButton church={session.tenantSlug} />}
    >
      {forms.length === 0 ? (
        <EmptyState title={t("form.empty")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {forms.map((form) => (
            <li key={form.id}>
              {/* A tile stands for a form and the whole tile opens it. */}
              <Card className="relative flex h-full flex-col gap-2 transition-shadow focus-within:shadow-md hover:shadow-md">
                <Link
                  href={`/forms/${form.id}?church=${session.tenantSlug}`}
                  className="text-heading text-fg after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none"
                >
                  {form.name}
                </Link>

                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone={form.status === "open" ? "success" : "neutral"}>
                    {t(`form.status.${form.status}` as never)}
                  </Badge>
                  <span className="text-caption text-fg-muted tabular-nums">
                    {form.questions === 0
                      ? t("form.noQuestions")
                      : plural("form.questions", form.questions)}
                  </span>
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
