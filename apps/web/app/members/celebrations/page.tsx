import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import {
  withTenant, listCelebrations, monthWindow, weekWindow, getChurch, canEditPeople,
  type CelebrationWindow,
} from "@hearth/db";
import { HueTag } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
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

  if (!canEditPeople(session)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const view: View = params.view === "week" ? "week" : "month";

  const { celebrations, at, window, today } = await withTenant(
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
    return `/members/celebrations?${query.toString()}`;
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
    <AppShell
      session={session}
      title={t("celebrations.title")}
      max="max-w-[880px]"
    >
      <Link
        href={`/members?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("people.title")}
      </Link>

      {/* The month either side of a 28px heading, and the one thing a church
          does with this list: print it. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="mr-1.5 font-display text-[22px] leading-[28px] text-fg">
            {heading}
          </span>
          <Link
            href={link({ at: earlier })}
            aria-label={t("celebrations.earlier")}
            className="grid size-8 place-items-center rounded-sm border border-line-strong bg-surface"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
          <Link
            href={link({ at: today })}
            aria-label={t("calendar.now")}
            className="grid size-8 place-items-center rounded-sm border border-line-strong bg-surface"
          >
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: "var(--color-fg-subtle)" }}
            />
          </Link>
          <Link
            href={link({ at: later })}
            aria-label={t("celebrations.later")}
            className="grid size-8 place-items-center rounded-sm border border-line-strong bg-surface"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md bg-sunken p-[3px]">
            {(["month", "week"] as View[]).map((option) => (
              <Link
                key={option}
                href={link({ view: option })}
                className={`h-7 cursor-pointer rounded-sm px-3 text-[13px] font-medium leading-7 ${
                  option === view ? "bg-surface text-fg shadow-sm" : "text-fg-muted"
                }`}
              >
                {t(option === "month" ? "celebrations.view.month" : "celebrations.view.week")}
              </Link>
            ))}
          </div>
          <Link
            href={`/members/celebrations/print?${new URLSearchParams({
              church: session.tenantSlug,
              view,
              at,
            }).toString()}`}
            target="_blank"
            className="flex h-[34px] items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-[13px] font-medium text-fg hover:bg-sunken [&_svg]:size-4"
          >
            <Printer /> {t("celebrations.print")}
          </Link>
        </div>
      </div>

      {/* Two counts, each with its hue, the number in Fraunces at 40. */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        {[
          { label: t("celebrations.birthdays"), n: birthdays.length, hue: "rose" },
          { label: t("celebrations.anniversaries"), n: anniversaries.length, hue: "violet" },
        ].map((tile) => (
          <div key={tile.label} className="rounded-lg border border-line bg-surface px-5 py-4.5">
            <div className="flex items-center gap-2 text-[13px] font-medium text-fg-muted">
              <span
                className="size-2 rounded-full"
                style={{ background: `var(--hue-${tile.hue}-500)` }}
              />
              {tile.label}
            </div>
            <div className="mt-2.5 font-display text-[40px] leading-[44px] text-fg">{tile.n}</div>
          </div>
        ))}
      </div>

      {celebrations.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-7 text-center text-fg-muted">
          {view === "week"
            ? t("celebrations.empty.week")
            : t("celebrations.empty.month", { span: heading })}
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-line bg-surface">
         <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="text-left text-[12px] font-semibold text-fg">
              <th className="w-[90px] border-b border-line px-4 py-3 font-medium">{t("celebrations.day")}</th>
              <th className="border-b border-line px-4 py-3 font-medium">{t("celebrations.who")}</th>
              <th className="border-b border-line px-4 py-3 font-medium">{t("celebrations.what")}</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) =>
              celebrations
                .filter((c) => c.on === day)
                .map((c, index) => (
                  <tr key={`${c.kind}-${c.personId}`}>
                    <td className="whitespace-nowrap border-b border-sunken px-4 py-2.5 text-fg-muted">
                      {index === 0 ? shortDate(day) : null}
                    </td>
                    <td className="border-b border-sunken px-4 py-2.5">
                      <Link
                        href={`/members/${c.personId}?church=${session.tenantSlug}`}
                        className="font-medium text-fg underline-offset-4 hover:underline"
                      >
                        {c.partnerName
                          ? t("celebrations.couple", { one: c.name, two: c.partnerName })
                          : c.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap border-b border-sunken px-4 py-2.5">
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
                    </td>
                  </tr>
                )),
            )}
          </tbody>
         </table>
        </div>
      )}
    </AppShell>
  );
}
