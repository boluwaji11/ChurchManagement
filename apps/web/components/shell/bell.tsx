"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell, UserPlus, CircleX, CircleCheck, TriangleAlert, Copy, ClipboardList,
  ChevronRight,
} from "lucide-react";
import { cn, Spinner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { readOne, readAll, olderThan } from "./bell-actions";

export interface BellItem {
  id: string;
  kind: string;
  hue: string;
  messageKey: string;
  params: Record<string, string | number>;
  href: string | null;
  unread: boolean;
  /** Already turned into words on the server, which holds the clock. */
  when: string;
  /** The raw timestamp, which is the cursor Show more reads from. */
  at: string;
  /** Set on the last line when more are waiting behind it. */
  more: boolean;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "user-plus": UserPlus,
  "circle-x": CircleX,
  "circle-check": CircleCheck,
  "triangle-alert": TriangleAlert,
  copy: Copy,
  "clipboard-list": ClipboardList,
};

/**
 * R24.6. The bell in the top bar.
 *
 * 36px square with a hairline, the unread count on a red pill hanging off its
 * corner, and a 380px panel underneath. Each line carries the hue of the thing
 * it is about, so a declined serving request and a new join request are told
 * apart before either is read.
 */
export function NotificationBell({
  items,
  unread,
  church,
}: {
  items: BellItem[];
  unread: number;
  church: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  // The first ten come from the server with the page. Show more appends.
  const [shown, setShown] = React.useState(items);
  const [loading, setLoading] = React.useState(false);
  const [working, startTransition] = React.useTransition();
  // Which line was pressed, so the spinner lands on that one.
  const [going, setGoing] = React.useState<string | null>(null);

  React.useEffect(() => setShown(items), [items]);

  const last = shown[shown.length - 1];

  const showMore = () => {
    if (!last || loading) return;
    setLoading(true);
    void olderThan(last.at, church)
      .then((next) => setShown((was) => [...was, ...next]))
      .finally(() => setLoading(false));
  };

  /*
   * R24.6. The church, added to an address that may already carry a query or
   * a hash.
   *
   * A line now lands where the thing is answered rather than at the top of a
   * list: the right month and team on the rota board, the responses on a
   * form, the requests on a group. Pinning "?church=" on the end of those
   * would have made every one of them a dead address.
   */
  const withChurch = (href: string, slug: string) => {
    const [path, hash] = href.split("#");
    const join = path!.includes("?") ? "&" : "?";
    return `${path}${join}church=${slug}${hash ? `#${hash}` : ""}`;
  };

  const open1 = (item: BellItem) => {
    setGoing(item.id);
    startTransition(async () => {
      await readOne(item.id, church);
      setOpen(false);
      setGoing(null);
      if (item.href) router.push(withChurch(item.href, church));
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-label={t("bell.title")}
        aria-expanded={open}
        className="relative grid size-9 cursor-pointer place-items-center rounded-md border border-line-strong bg-surface hover:bg-sunken"
      >
        <Bell className="size-[17px]" aria-hidden />
        {unread > 0 ? (
          <span className="absolute -top-[5px] -right-[5px] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-[5px] text-[11px] font-semibold text-white">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-11 right-0 z-50 flex w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3.5">
              <span className="flex-1 font-semibold text-fg">{t("bell.title")}</span>
              {unread > 0 ? (
                <button
                  type="button"
                  disabled={working}
                  onClick={() =>
                    startTransition(async () => {
                      await readAll(church);
                      setOpen(false);
                    })}
                  className="flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-primary disabled:opacity-60"
                >
                  {working && going === null ? <Spinner label={t("bell.markAll")} /> : null}
                  {t("bell.markAll")}
                </button>
              ) : null}
            </div>

            <div className="max-h-[420px] overflow-auto">
              {shown.length === 0 ? (
                /* The same empty state every other screen uses, sized down to
                   the panel it sits in. */
                <Empty icon="inbox" title={t("bell.empty")} className="gap-3 px-4 py-8" />
              ) : (
                shown.map((item) => {
                  const Icon = ICONS[item.kind] ?? Bell;
                  /*
                   * R24.6. A line that goes somewhere is pressed; a line that
                   * does not is read. Every one of them looked the same and
                   * behaved two ways, so half of them answered a press by
                   * doing nothing, which reads as broken rather than as
                   * finished.
                   */
                  const goes = Boolean(item.href);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={working || !goes}
                      aria-disabled={goes ? undefined : true}
                      onClick={() => open1(item)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-sunken px-4 py-3 text-left",
                        goes ? "cursor-pointer hover:bg-canvas" : "cursor-default",
                        item.unread ? "bg-canvas" : "bg-surface",
                      )}
                    >
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-full [&_svg]:size-4"
                        style={{
                          background: `var(--hue-${item.hue}-tint)`,
                          color: `var(--hue-${item.hue}-key)`,
                        }}
                      >
                        <Icon />
                      </span>
                      <span className="min-w-0 flex-1 leading-[18px]">
                        <span className="block text-[13px] text-fg">
                          {t(item.messageKey as never, item.params as never)}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-fg-subtle">{item.when}</span>
                      </span>
                      {going === item.id ? (
                        <Spinner className="mt-0.5 shrink-0 text-fg-muted" label={t("bell.opening")} />
                      ) : (
                        <span className="mt-0.5 flex shrink-0 items-center gap-2">
                          {item.unread ? (
                            <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                          ) : null}
                          {goes ? (
                            <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                          ) : null}
                        </span>
                      )}
                    </button>
                  );
                })
              )}

              {last?.more ? (
                <button
                  type="button"
                  onClick={showMore}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-1.5 py-3 text-[13px] font-medium text-primary hover:bg-canvas disabled:opacity-60"
                >
                  {loading ? <Spinner label={t("bell.more")} /> : null}
                  {t("bell.more")}
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
