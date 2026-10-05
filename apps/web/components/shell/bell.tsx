"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell, UserPlus, CircleX, CircleCheck, TriangleAlert, Copy, ClipboardList,
} from "lucide-react";
import { cn } from "@hearth/ui";
import { t } from "@hearth/i18n";
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

  React.useEffect(() => setShown(items), [items]);

  const last = shown[shown.length - 1];

  const showMore = () => {
    if (!last || loading) return;
    setLoading(true);
    void olderThan(last.at, church)
      .then((next) => setShown((was) => [...was, ...next]))
      .finally(() => setLoading(false));
  };

  const open1 = (item: BellItem) => {
    setOpen(false);
    void readOne(item.id, church);
    if (item.href) router.push(`${item.href}?church=${church}`);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-label={t("bell.title")}
        aria-expanded={open}
        className="relative grid size-9 place-items-center rounded-md border border-line-strong bg-surface hover:bg-sunken"
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
                  onClick={() => {
                    void readAll(church);
                    setOpen(false);
                  }}
                  className="text-[13px] font-medium text-primary"
                >
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
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => open1(item)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-sunken px-4 py-3 text-left hover:bg-canvas",
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
                      {item.unread ? (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                      ) : null}
                    </button>
                  );
                })
              )}

              {last?.more ? (
                <button
                  type="button"
                  onClick={showMore}
                  disabled={loading}
                  className="w-full py-3 text-[13px] font-medium text-primary hover:bg-canvas disabled:opacity-60"
                >
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
