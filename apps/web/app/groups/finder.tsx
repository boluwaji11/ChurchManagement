"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, Search, SlidersHorizontal, Plus, Undo2 } from "lucide-react";
import {
  Banner, Button, IconButton, Card, Separator, Switch,
  Sheet, SheetContent, SheetTrigger, LIFT,
} from "@hearth/ui";
import { MultiSelect } from "@/components/multi-select";
import { Empty } from "@/components/empty";
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

type Chosen = {
  type: string[];
  day: string[];
  forWhom: string[];
  online: string[];
  children: string[];
  location: string[];
  taking: string[];
};

const NOTHING: Chosen = {
  type: [], day: [], forWhom: [], online: [], children: [], location: [], taking: [],
};

const AUDIENCES = ["anyone", "men", "women", "young_adults", "students", "parents", "seniors"] as const;

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
  /*
   * Two copies: what the list is filtered by, and what the drawer is being set
   * to. Nothing moves under the reader while they are still choosing, unless
   * they have asked for it to.
   */
  const [chosen, setChosen] = React.useState<Chosen>(NOTHING);
  const [draft, setDraft] = React.useState<Chosen>(NOTHING);
  const [live, setLive] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const text = query.trim().toLowerCase();
  const archivedGroups = groups.filter((group) => group.archived);
  const all = groups.filter((group) => !group.archived);

  const matches = (group: FinderGroup, by: Chosen) =>
    (by.type.length === 0 || by.type.includes(group.typeId ?? "")) &&
    (by.day.length === 0 || by.day.includes(String(group.dayOfWeek))) &&
    (by.forWhom.length === 0 || by.forWhom.includes(group.forWhom ?? "anyone")) &&
    (by.online.length === 0 || by.online.includes(group.online ? "yes" : "no")) &&
    (by.children.length === 0 || by.children.includes(group.childrenWelcome ? "yes" : "no")) &&
    (by.location.length === 0 || by.location.includes(group.location ?? "")) &&
    (by.taking.length === 0 ||
      by.taking.includes(group.openToJoin && !group.full ? "open" : "closed")) &&
    (text === "" ||
      group.name.toLowerCase().includes(text) ||
      group.leaderNames.some((name) => name.toLowerCase().includes(text)) ||
      (group.description ?? "").toLowerCase().includes(text) ||
      (group.location ?? "").toLowerCase().includes(text));

  const shown = all.filter((group) => matches(group, chosen));
  const drafted = all.filter((group) => matches(group, draft));

  /**
   * The questions the drawer asks, and the answers this church actually has.
   *
   * An option nobody's group matches is left out, and a question with one
   * possible answer is not a question, so it goes too.
   */
  const has = <T,>(pick: (g: FinderGroup) => T) => new Set(all.map(pick));
  const types_ = has((g) => g.typeId);
  const days = has((g) => g.dayOfWeek);
  const audiences = has((g) => g.forWhom ?? "anyone");
  const wheres = [...has((g) => g.location)].filter(Boolean).sort() as string[];

  const sections = [
    {
      k: "type" as const,
      label: t("groups.type"),
      opts: types.filter((one) => types_.has(one.id)).map((one) => ({ value: one.id, label: one.name })),
    },
    {
      k: "day" as const,
      label: t("find.meetsOn"),
      opts: [0, 1, 2, 3, 4, 5, 6]
        .filter((d) => days.has(d))
        .map((d) => ({ value: String(d), label: dayName(d) })),
    },
    {
      k: "forWhom" as const,
      label: t("find.forWhom"),
      opts: AUDIENCES.filter((a) => audiences.has(a)).map((a) => ({
        value: a,
        label: t(`groups.audience.${a}` as never),
      })),
    },
    {
      k: "location" as const,
      label: t("groups.location"),
      opts: wheres.map((where) => ({ value: where, label: where })),
    },
    {
      k: "online" as const,
      label: t("groups.online"),
      opts: [
        { value: "yes", label: t("find.yes") },
        { value: "no", label: t("find.no") },
      ].filter((o) => all.some((g) => (g.online ? "yes" : "no") === o.value)),
    },
    {
      k: "children" as const,
      label: t("groups.childrenWelcome"),
      opts: [
        { value: "yes", label: t("find.yes") },
        { value: "no", label: t("find.no") },
      ].filter((o) => all.some((g) => (g.childrenWelcome ? "yes" : "no") === o.value)),
    },
    {
      k: "taking" as const,
      label: t("find.taking"),
      opts: [
        { value: "open", label: t("find.open") },
        { value: "closed", label: t("find.closed") },
      ].filter((o) =>
        all.some((g) => (g.openToJoin && !g.full ? "open" : "closed") === o.value),
      ),
    },
  ].filter((section) => section.opts.length > 1 || draft[section.k].length > 0);

  const picked = Object.values(chosen).reduce((n, list) => n + list.length, 0);

  /** Writes an answer into the draft, and into the list too where live is on. */
  const pick = (k: keyof Chosen, values: string[]) => {
    const next = { ...draft, [k]: values };
    setDraft(next);
    if (live) setChosen(next);
  };

  const clear = () => {
    setDraft(NOTHING);
    setChosen(NOTHING);
  };

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
        <label className="flex h-[34px] min-w-40 flex-[0_1_340px] items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-2.5 text-fg-subtle focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ring)]">
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

        <span className="flex-1" />

        <Sheet
          open={open}
          onOpenChange={(next) => {
            if (next) setDraft(chosen);
            setOpen(next);
          }}
        >
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
                <Button variant="secondary" onClick={clear}>
                  {t("find.clear")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setChosen(draft);
                    setOpen(false);
                  }}
                >
                  {plural("find.show", drafted.length)}
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-4">
              {sections.map((section) => (
                <div key={section.k} className="flex flex-col gap-1.5">
                  <span className="text-label text-fg">{section.label}</span>
                  <MultiSelect
                    label={section.label}
                    options={section.opts}
                    value={draft[section.k]}
                    onChange={(next) => pick(section.k, next)}
                    summary={(picks) =>
                      picks.length > 2
                        ? t("find.chosen", { count: picks.length })
                        : picks.map((one) => one.label).join(", ")
                    }
                  />
                </div>
              ))}

              {/* Nothing moves while somebody is still choosing, unless they
                  would rather watch it narrow as they go. */}
              <label className="mt-2 flex cursor-pointer items-center gap-3 border-t border-line pt-4">
                <Switch
                  checked={live}
                  onCheckedChange={(on) => {
                    setLive(on);
                    if (on) setChosen(draft);
                  }}
                />
                <span className="text-[length:var(--d-text-body)] text-fg">
                  {t("find.liveFilter")}
                </span>
              </label>
            </div>
          </SheetContent>
        </Sheet>

        {canManage ? (
          <Button asChild className="h-[34px] min-h-0 gap-1.5 px-3 text-[13px]">
            <Link href={`/groups/new?church=${church}`}>
              <Plus className="size-4" aria-hidden /> {t("groups.add")}
            </Link>
          </Button>
        ) : null}
      </div>

      {shown.length === 0 ? (
        /*
         * R24.17. Two different nothings. A church with no groups at all is on
         * its first week and is offered the way to write one down. A church
         * whose filters match nothing is offered the way back.
         */
        all.length === 0 ? (
          <Empty
            icon="group"
            title={t("groups.none.title")}
            action={
              canManage ? (
                <Button asChild>
                  <Link href={`/groups/new?church=${church}`}>
                    <Plus /> {t("groups.add")}
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Empty
            icon="noResults"
            title={t("find.noMatch")}
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  clear();
                  setQuery("");
                }}
              >
                {t("find.clearFilters")}
              </Button>
            }
          />
        )
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
        <div className="h-[120px]" style={{ background: `var(--hue-${hue}-tint)` }} />
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
