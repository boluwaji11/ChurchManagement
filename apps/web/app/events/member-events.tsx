import Link from "next/link";
import { withTenant, getChurch, listEvents } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { PortalShell, PortalTitle, Panel } from "@/components/portal-shell";
import { churchNow } from "@/lib/church-now";
import { supabaseServer } from "@/lib/supabase/server";
import type { Session } from "@/lib/session";

/**
 * R14.2, R17.1. What the church has on, for somebody who is not running it.
 *
 * The listed events only, still to come, newest first. Each one opens the page
 * the church would link to from a bulletin, which is where registering happens,
 * so there is one event page rather than two.
 */
export async function MemberEvents({ session }: { session: Session }) {
  const { events, covers } = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const clock = churchNow(
        (await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago",
      );
      const all = (await listEvents(tx, { from: clock.date }))
        .filter((one) => one.listed && one.status !== "cancelled");

      // The bucket is private, so each cover is served through a link signed
      // for an hour. One pass rather than one round trip a card.
      const covers = new Map<string, string>();
      const withCover = all.filter((one) => one.coverKey);
      if (withCover.length > 0) {
        const supabase = await supabaseServer();
        for (const one of withCover) {
          const signed = await supabase.storage
            .from("church")
            .createSignedUrl(one.coverKey!, 3600);
          if (signed.data?.signedUrl) covers.set(one.id, signed.data.signedUrl);
        }
      }
      return { events: all, covers };
    },
  );

  return (
    <PortalShell session={session}>
      <PortalTitle title={t("nav.events")} />

      {events.length === 0 ? (
        <Panel>
          <p className="text-[length:var(--d-text-body)] text-fg-muted">
            {t("event.noneAhead")}
          </p>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((one) => {
            const when = new Date(`${one.startsOn}T00:00:00`);
            const cover = covers.get(one.id);
            return (
              <Link
                key={one.id}
                href={`/e/${session.tenantSlug}/${one.slug}`}
                className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-line-strong"
              >
                <span
                  className="flex h-28 items-end bg-cover bg-center p-4"
                  style={
                    cover
                      ? { backgroundImage: `url(${cover})` }
                      : { background: `var(--hue-${one.hue}-tint)` }
                  }
                >
                  <span className="rounded-full bg-surface px-2.5 py-0.5 text-caption font-medium text-fg">
                    {when.toLocaleDateString("en-US", {
                      weekday: "short", day: "numeric", month: "short",
                    })}
                  </span>
                </span>

                <span className="flex flex-col gap-1 p-5">
                  <span className="font-display text-[22px] leading-7 text-fg">{one.name}</span>
                  <span className="text-[length:var(--d-text-body)] text-fg-muted">
                    {one.location ?? ""}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
