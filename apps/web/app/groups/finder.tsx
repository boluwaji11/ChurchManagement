"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, Search, SlidersHorizontal, Image as ImageIcon, Undo2 } from "lucide-react";
import {
  Banner, Button, IconButton, Card, Separator,
  Sheet, SheetContent, SheetTrigger, LIFT,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { decide, archive } from "./actions";

export interface FinderGroup {
  id: string;
  /** R9.2. Signed for an hour by the page, because the bucket is private. */
  photoUrl?: string | null;
  name: string;
  description: string | null;
  typeId: string | null;
  typeName: string | null;
  typeHue: string | null;
  dayOfWeek: number | null;
  startsAt: string | null;
  endsAt: string | null;
  frequency: string | null;
  location: string | null;
  forWhom: string | null;
  online: boolean;
  childrenWelcome: boolean;
  memberCount: number;
  leaderNames: string[];
  openToJoin: boolean;
  full: boolean;
  mine: boolean;
  requested: string | null;
  listed: boolean;
  archived: boolean;
}

export interface FinderType {
  id: string;
  name: string;
  description: string | null;
  hue: string;
}

export interface FinderRequest {
  id: string;
  groupName: string;
  personName: string;
  message: string | null;
}

/** R9.2. Putting an archived group back on the lists. */
async function restore(id: string, church: string): Promise<{ error?: string }> {
  const data = new FormData();
  data.set("church", church);
  data.set("id", id);
  data.set("archived", "false");
  return archive(data);
}

export const dayName = (day: number) =>
  new Date(2024, 0, 7 + day).toLocaleDateString("en-US", { weekday: "long" });

export const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
};

/** "Wednesdays, 9:30 am", which is how somebody reads it out. */
export function meets(group: {
  dayOfWeek: number | null;
  startsAt: string | null;
  location: string | null;
}): string {
  if (group.dayOfWeek === null) return group.location ?? "";
  const day = `${dayName(group.dayOfWeek)}s`;
  return group.startsAt ? `${day}, ${readableTime(group.startsAt)}` : day;
}

type Chosen = { type: string[]; day: string[]; taking: string[] };
const NOTHING: Chosen = { type: [], day: [], taking: [] };

/**
 * R9.5, R9.6. Finding a group.
 *
 * Built to docs/redesign/design: a box to type in, the count beside it, and
 * everything else behind one Filter button. A church has tens of groups, so the
 * filtering happens here and a dropdown costs no round trip.
 *
 * The cards carry a banner, the kind, whether it is taking people, the name,
 * when it meets and who leads it. That is the order somebody reads them in.
 */
export function Finder({
  church,
  groups,
  types,
  requests,
  canManage,
}: {
  church: string;
  groups: FinderGroup[];
  types: FinderType[];
  requests: FinderRequest[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [chosen, setChosen] = React.useState<Chosen>(NOTHING);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const text = query.trim().toLowerCase();
  const archivedGroups = groups.filter((group) => group.archived);
  const live = groups.filter((group) => !group.archived);

  const matches = (group: FinderGroup, skip?: keyof Chosen) =>
    (skip === "type" || chosen.type.length === 0 || chosen.type.includes(group.typeId ?? "")) &&
    (skip === "day" || chosen.day.length === 0 || chosen.day.includes(String(group.dayOfWeek))) &&
    (skip === "taking" ||
      chosen.taking.length === 0 ||
      chosen.taking.includes(group.openToJoin && !group.full ? "open" : "closed")) &&
    (text === "" ||
      group.name.toLowerCase().includes(text) ||
      group.leaderNames.some((name) => name.toLowerCase().includes(text)) ||
      (group.description ?? "").toLowerCase().includes(text) ||
      (group.location ?? "").toLowerCase().includes(text));

  const shown = live.filter((group) => matches(group));

  /** Each option carries how many groups it would leave, ignoring its own section. */
  const sections = [
    {
      k: "type" as const,
      label: t("groups.type"),
      opts: types.map((kind) => ({
        v: kind.id,
        label: kind.name,
        n: live.filter((g) => g.typeId === kind.id && matches(g, "type")).length,
      })),
    },
    {
      k: "day" as const,
      label: t("find.meetsOn"),
      opts: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        v: String(d),
        label: dayName(d),
        n: live.filter((g) => g.dayOfWeek === d && matches(g, "day")).length,
      })),
    },
    {
      k: "taking" as const,
      label: t("find.taking"),
      opts: [
        {
          v: "open",
          label: t("find.open"),
          n: live.filter((g) => g.openToJoin && !g.full && matches(g, "taking")).length,
        },
        {
          v: "closed",
          label: t("find.closed"),
          n: live.filter((g) => (!g.openToJoin || g.full) && matches(g, "taking")).length,
        },
      ],
    },
  ].map((section) => ({ ...section, opts: section.opts.filter((o) => o.n > 0 || chosen[section.k].includes(o.v)) }));

  const picked = chosen.type.length + chosen.day.length + chosen.taking.length;

  const toggle = (k: keyof Chosen, v: string) =>
    setChosen((was) => ({
      ...was,
      [k]: was[k].includes(v) ? was[k].filter((one) => one !== v) : [...was[k], v],
    }));

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("find.failed")}>{error}</Banner> : null}

      {/* R9.6. What this person owes an answer to, above what they are browsing. */}
      {requests.length > 0 ? (
        <Card className="flex flex-col gap-3">
          <span className="text-label text-fg-muted">{t("find.requests")}</span>
          {requests.map((request, i) => (
            <div key={request.id}>
              {i > 0 ? <Separator className="my-2" /> : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="text-[length:var(--d-text-body)] text-fg">
                    {request.personName}
                  </span>
                  <span className="ml-2 text-caption text-fg-muted">{request.groupName}</span>
                  {request.message ? (
                    <span className="block text-caption text-fg-muted">{request.message}</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1">
                  <IconButton
                    label={t("find.approve")}
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => decide(request.id, true, church))}
                  >
                    <Check />
                  </IconButton>
                  <IconButton
                    label={t("find.decline")}
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => decide(request.id, false, church))}
                  >
                    <X />
                  </IconButton>
                </span>
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      {/* The box, the count, and one Filter button on the right. */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-[34px] min-w-40 flex-[0_1_240px] items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-2.5 text-fg-subtle focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ring)]">
          <Search className="size-[15px] shrink-0" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("find.groupOrLeader")}
            aria-label={t("find.groupOrLeader")}
            autoComplete="off"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-subtle"
          />
        </label>

        <span className="text-[13px] text-fg-muted">{plural("find.count", shown.length)}</span>
        <span className="flex-1" />

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" className="h-[34px] min-h-0 gap-1.5 px-3 text-[13px]">
              <SlidersHorizontal className="size-4" aria-hidden />
              {picked > 0 ? t("find.filterCount", { count: picked }) : t("find.filter")}
            </Button>
          </SheetTrigger>

          <SheetContent
            title={t("find.filterTitle")}
            closeLabel={t("common.close")}
            width="380px"
            footer={
              <div className="flex w-full items-center gap-2">
                <Button variant="secondary" onClick={() => setChosen(NOTHING)}>
                  {t("find.clear")}
                </Button>
                <Button className="flex-1" onClick={() => setOpen(false)}>
                  {plural("find.show", shown.length)}
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-6">
              {sections.map((section) => (
                <div key={section.k} className="flex flex-col gap-2.5">
                  <div className="text-[12px] font-semibold text-fg-subtle">{section.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {section.opts.map((option) => {
                      const on = chosen[section.k].includes(option.v);
                      return (
                        <button
                          key={option.v}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggle(section.k, option.v)}
                          className={
                            "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium transition-colors " +
                            (on
                              ? "border-fg bg-fg text-canvas"
                              : "border-line-strong bg-surface text-fg hover:bg-sunken")
                          }
                        >
                          {option.label}
                          <span className="text-[12px] opacity-70">{option.n}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {shown.length === 0 ? (
        <div className="py-12 text-center text-fg-muted">
          {t("find.noMatch")}{" "}
          <button
            type="button"
            onClick={() => {
              setChosen(NOTHING);
              setQuery("");
            }}
            className="font-medium text-primary"
          >
            {t("find.clearFilters")}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {shown.map((group) => (
            <GroupCard key={group.id} church={church} group={group} />
          ))}
        </div>
      )}

      {/* R9.2. Archived groups, for whoever runs them. */}
      {canManage && archivedGroups.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-label text-fg-muted">{t("groups.archived")}</h2>
          {archivedGroups.map((group) => (
            <div key={group.id} className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[length:var(--d-text-body)] text-fg-muted">{group.name}</span>
              <IconButton
                label={t("groups.restore")}
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => restore(group.id, church))}
              >
                <Undo2 />
              </IconButton>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * One group, as a card.
 *
 * A banner across the top in the kind's own colour, and under it the kind, the
 * name, when it meets, who leads it and how many are in it. The whole card
 * opens the group, so the name carries a stretched link rather than the card
 * carrying a click handler.
 */
function GroupCard({ church, group }: { church: string; group: FinderGroup }) {
  const hue = group.typeHue ?? "sky";
  const leader = group.leaderNames[0];
  const line = [meets(group), leader ? t("groups.leaders") : null].filter(Boolean);

  return (
    <section
      className={`relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface ${LIFT}`}
    >
      {group.photoUrl ? (
        <img src={group.photoUrl} alt="" className="h-[120px] w-full object-cover" />
      ) : (
        <div
          className="grid h-[120px] place-items-center"
          style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
        >
          <ImageIcon className="size-[22px] opacity-50" aria-hidden />
        </div>
      )}

      <div className="flex flex-col gap-2 px-[18px] pt-4 pb-[18px]">
        <div className="flex items-center gap-2">
          {group.typeName ? (
            <span
              className="rounded-full px-2 py-0.5 text-[12px] font-medium"
              style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
            >
              {group.typeName}
            </span>
          ) : null}
          <span
            className="ml-auto text-[12px] font-medium"
            style={{
              color: group.openToJoin && !group.full ? "var(--hue-fern-key)" : "var(--fg-muted)",
            }}
          >
            {group.full ? t("find.full") : group.openToJoin ? t("find.open") : t("find.closed")}
          </span>
        </div>

        <Link
          href={`/groups/${group.id}?church=${church}`}
          className="font-display text-[22px] leading-[28px] text-fg after:absolute after:inset-0 focus-visible:outline-none"
        >
          {group.name}
        </Link>

        <div className="text-[13px] text-fg-muted">
          {leader ? t("find.ledBy", { meets: meets(group), leader }) : line[0]}
        </div>

        <div className="text-[13px] text-fg">
          <strong className="font-semibold">{group.memberCount}</strong>{" "}
          {t("groups.members").toLowerCase()}
        </div>
      </div>
    </section>
  );
}
