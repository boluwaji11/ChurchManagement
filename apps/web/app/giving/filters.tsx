"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import {
  Button, Sheet, SheetTrigger, SheetContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { MultiSelect } from "@/components/multi-select";
import {
  PERIODS, METHODS, STATES, STATE_LABELS, type Narrowing, narrowingCount,
} from "./narrowing";

/**
 * R13.21. What the giving list is narrowed to, chosen in a panel.
 *
 * Built the way the group finder builds its filter, because a church that
 * has learned one of those screens has learned both: one question to a row,
 * a dropdown where the answer is one of a set and a multi select where it
 * is any of them.
 *
 * Nothing moves until Show is pressed. A list that re-sorts itself under
 * somebody halfway through choosing is a list they have to find their place
 * in again.
 */
export function GivingFilters({
  church,
  now,
  funds,
}: {
  church: string;
  now: Narrowing;
  funds: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Narrowing>(now);
  /*
   * R24.6. Narrowing the gifts is a round trip, so it says so. The panel
   * stays open with its controls dead and the button spinning, and puts
   * itself away when the rows land.
   */
  const [busy, startNarrowing] = React.useTransition();

  /* The panel opens on what is actually in force, never on what somebody
     half chose the last time and walked away from. */
  const onOpenChange = (next: boolean) => {
    if (next) setDraft(now);
    setOpen(next);
  };

  const apply = (one: Narrowing) => {
    const next = new URLSearchParams(params.toString());
    next.set("church", church);
    const set = (key: string, value: string) => {
      if (value) next.set(key, value);
      else next.delete(key);
    };
    set("period", one.period === "year" ? "" : one.period);
    set("fund", one.fundIds.join(","));
    set("how", one.methods.join(","));
    set("state", one.statuses.join(","));
    // A narrowed list has its own first page.
    next.delete("gifts");
    next.delete("counts");
    startNarrowing(() => {
      router.push(`${pathname}?${next.toString()}`);
      setOpen(false);
    });
  };

  const options = (values: readonly string[], label: (one: string) => string) =>
    values.map((value) => ({ value, label: label(value) }));

  const sections: {
    key: "fundIds" | "methods" | "statuses";
    label: string;
    opts: { value: string; label: string }[];
  }[] = [
    {
      key: "fundIds",
      label: t("giving.filter.fund"),
      opts: funds.map((one) => ({ value: one.id, label: one.name })),
    },
    {
      key: "methods",
      label: t("giving.filter.method"),
      opts: options(METHODS, (one) => t(`giving.method.${one}` as never)),
    },
    {
      key: "statuses",
      label: t("giving.filter.status"),
      opts: options(STATES, (one) => t(STATE_LABELS[one as keyof typeof STATE_LABELS] as never)),
    },
  ];

  const narrowing = narrowingCount(now);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="h-[34px] min-h-0 gap-1.5 px-3 text-[13px]">
          <SlidersHorizontal className="size-4" aria-hidden />
          {narrowing > 0 ? t("find.filterCount", { count: narrowing }) : t("find.filter")}
        </Button>
      </SheetTrigger>

      <SheetContent
        title={t("giving.filter.title")}
        closeLabel={t("common.close")}
        width="380px"
        footer={
          <div className="flex w-full items-center gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => apply({ period: "year", fundIds: [], methods: [], statuses: [] })}
            >
              {t("find.clear")}
            </Button>
            {/* No count on it. The server does the narrowing, so a figure
                here would be the one from before the last choice. */}
            <Button className="flex-1" loading={busy} onClick={() => apply(draft)}>
              {t("giving.filter.show")}
            </Button>
          </div>
        }
      >
        <div
          aria-busy={busy}
          className={`flex flex-col gap-4 ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("giving.filter.period")}</span>
            <Select
              value={draft.period}
              onValueChange={(next) =>
                setDraft((was) => ({ ...was, period: next as Narrowing["period"] }))
              }
            >
              <SelectTrigger aria-label={t("giving.filter.period")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((one) => (
                  <SelectItem key={one} value={one}>
                    {t(`giving.filter.period.${one}` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sections.map((section) => (
            <div key={section.key} className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{section.label}</span>
              <MultiSelect
                label={section.label}
                options={section.opts}
                value={draft[section.key]}
                onChange={(next) => setDraft((was) => ({ ...was, [section.key]: next }))}
                summary={(picks) =>
                  picks.length > 2
                    ? t("find.chosen", { count: picks.length })
                    : picks.map((one) => one.label).join(", ")
                }
              />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
