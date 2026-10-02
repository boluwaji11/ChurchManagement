import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  withTenant, listCelebrations, monthWindow, weekWindow, getChurch, canEditPeople,
  type CelebrationWindow,
} from "@hearth/db";
import { Button, Table, Thead, Th, Tr, Td, HueTag, EmptyState, StatTile } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * R2.11. Birthdays and anniversaries for a month or a week.
 *
 * The window is in the URL, so a church can keep the October list open in a tab
 * and send the same link to whoever writes the cards.
 */

type View = "month" | "week";

interface Params {
  church?: string;
  view?: string;
  at?: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const shift = (iso: string, days: number): string => {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};

const shiftMonths = (iso: string, months: number): string => {
  const [y, m] = iso.split("-").map(Number);
  const at = new Date(Date.UTC(y!, m! - 1 + months, 1));
  return at.toISOString().slice(0, 10);
};

const monthName = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });

export default async function CelebrationsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const session = await requireSession(params.church);

  if (!canEditPeople(session.role)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const view: View = params.view === "week" ? "week" : "month";

  const { celebrations, today, at, window } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const church = await getChurch(tx, session.tenantId);
      const now = churchNow(church?.timezone ?? "America/Chicago").date;
      const asked = params.at && ISO.test(params.at) ? params.at : now;

      const [y, m] = asked.split("-").map(Number);
      const w: CelebrationWindow = view === "week"
        ? weekWindow(asked)
        : monthWindow(y!, m!);

      return {
        today: now,
        at: asked,
        window: w,
        celebrations: await listCelebrations(tx, w),
      };
    },
  );

  const link = (next: { view?: View; at?: string }) => {
    const query = new URLSearchParams({
      church: session.tenantSlug,
      view: next.view ?? view,
      at: next.at ?? at,
    });
    return `/people/celebrations?${query.toString()}`;
  };

  const step = view === "week" ? 7 : 0;
  const earlier = view === "week" ? shift(at, -step) : shiftMonths(at, -1);
  const later = view === "week" ? shift(at, step) : shiftMonths(at, 1);

  const heading = view === "week"
    ? t("celebrations.span", { from: shortDate(window.from), to: shortDate(window.to) })
    : monthName(window.from);

  const birthdays = celebrations.filter((c) => c.kind === "birthday");
  const anniversaries = celebrations.filter((c) => c.kind === "anniversary");

  // Grouped by the day they fall on, so the day is written once.
  const days = [...new Set(celebrations.map((c) => c.on))];

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageTitle title={t("celebrations.title")} className="mb-8" />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
            {(["month", "week"] as View[]).map((option) => (
              <Button
                key={option}
                variant={option === view ? "primary" : "ghost"}
                asChild
              >
                <Link href={link({ view: option })}>
                  {t(option === "month" ? "celebrations.view.month" : "celebrations.view.week")}
                </Link>
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" asChild>
              <Link href={link({ at: earlier })} aria-label={t("celebrations.earlier")}>
                <ChevronLeft aria-hidden />
              </Link>
            </Button>
            <span className="min-w-48 text-center text-body-lg font-medium text-fg">
              {heading}
            </span>
            <Button variant="secondary" asChild>
              <Link href={link({ at: later })} aria-label={t("celebrations.later")}>
                <ChevronRight aria-hidden />
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href={link({ at: today })}>
                {t(view === "week" ? "celebrations.now.week" : "celebrations.now.month")}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <StatTile label={t("celebrations.birthdays")} value={String(birthdays.length)} hue="rose" />
          <StatTile
            label={t("celebrations.anniversaries")}
            value={String(anniversaries.length)}
            hue="violet"
          />
        </div>

        {celebrations.length === 0 ? (
          <EmptyState
            title={view === "week"
              ? t("celebrations.empty.week")
              : t("celebrations.empty.month", { span: heading })}
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>{t("celebrations.day")}</Th>
                <Th>{t("celebrations.who")}</Th>
                <Th>{t("celebrations.what")}</Th>
              </Tr>
            </Thead>
            <tbody>
              {days.map((day) =>
                celebrations
                  .filter((c) => c.on === day)
                  .map((c, index) => (
                    <Tr key={`${c.kind}-${c.personId}`}>
                      <Td className="whitespace-nowrap text-fg-muted">
                        {index === 0 ? shortDate(day) : null}
                      </Td>
                      <Td>
                        <Link
                          href={`/people/${c.personId}?church=${session.tenantSlug}`}
                          className="font-medium text-fg underline-offset-4 hover:underline"
                        >
                          {c.partnerName
                            ? t("celebrations.couple", { one: c.name, two: c.partnerName })
                            : c.name}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <HueTag hue={c.kind === "birthday" ? "rose" : "violet"}>
                            {c.kind === "birthday"
                              ? t("celebrations.kind.birthday")
                              : t("celebrations.kind.anniversary")}
                          </HueTag>
                          {c.years === null ? null : (
                            <span className="text-fg-muted">
                              {c.kind === "birthday"
                                ? t("celebrations.turning", { years: c.years })
                                : t("celebrations.married", { years: c.years })}
                            </span>
                          )}
                        </span>
                      </Td>
                    </Tr>
                  )),
              )}
            </tbody>
          </Table>
        )}
      </main>
    </>
  );
}
