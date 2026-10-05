import Link from "next/link";
import { redirect } from "next/navigation";
import { withTenant, listForms, canEditPeople, canReadIncidents } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { PortalShell, PortalTitle, Panel } from "@/components/portal-shell";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * R17.9. What the church is asking, for somebody who can answer it signed in.
 *
 * The same forms behind the same links a church puts on its own website. The
 * difference is that this reader is known, so what the church already holds is
 * already in the boxes.
 */
export default async function MyFormsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (canEditPeople(session) || canReadIncidents(session)) {
    redirect(`/forms?church=${session.tenantSlug}`);
  }

  const open = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => (await listForms(tx)).filter((one) => one.status === "open"),
  );

  return (
    <PortalShell session={session}>
      <PortalTitle title={t("form.title")} />

      {open.length === 0 ? (
        <Panel>
          <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("form.noneOpen")}</p>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {open.map((one) => (
            <Link
              key={one.id}
              href={`/home/forms/${one.slug}?church=${session.tenantSlug}`}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
            >
              <span
                aria-hidden
                className="h-1.5 w-10 rounded-full"
                style={{ background: `var(--hue-${one.hue}-500)` }}
              />
              <span className="font-display text-[22px] leading-7 text-fg">{one.name}</span>
              <span className="text-caption text-fg-muted">
                {t("form.questionCount", { count: String(one.questions) })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
