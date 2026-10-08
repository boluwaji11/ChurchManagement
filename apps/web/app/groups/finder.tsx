"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, SlidersHorizontal, Plus, Undo2 } from "lucide-react";
import {
  Avatar, Banner, Button, IconButton, Switch,
  Sheet, SheetContent, SheetTrigger, LIFT,
} from "@connectapp/ui";
import { MultiSelect } from "@/components/multi-select";
import { Empty } from "@/components/empty";
import { t, plural } from "@connectapp/i18n";
import { archive } from "./actions";
import { SearchField } from "@/components/search-field";
import { useFormError } from "@/lib/form-error";
import {
  SortMenu, ViewToggle, ShowMore, useListPreference, useShowMore, type ListView,
} from "@/components/list-controls";

export interface FinderGroup {
  id: string;
  slug: string;
  /** R24.6. When it was written, for the order the list reads in. */
  createdAt: string;
  /** R9.5. "draft" while the open web cannot see it yet. */
  status: "draft" | "published";
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
  memberCount: number | null;
  leaderNames: string[];
  openToJoin: boolean;
  full: boolean;
  mine: boolean;
  requested: string | null;
  listed: boolean;
  archived: boolean;
}

/** R9.5. The two bands a groups list is read in, published first. */
const BANDS = [
  { key: "published" as const, heading: () => t("event.published") },
  { key: "draft" as const, heading: () => t("event.draft") },
];

/** R24.6. The orders a groups list is worth reading in. */
type GroupOrder = "name" | "newest" | "oldest" | "draftsFirst";

const BY_GROUP: Record<GroupOrder, (a: FinderGroup, b: FinderGroup) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  // Orders the bands rather than the rows. Inside a band, by name.
  draftsFirst: (a, b) => a.name.localeCompare(b.name),
};


export interface FinderType {
  id: string;
  name: string;
  description: string | null;
  hue: string;
}

export interface FinderRequest {
  id: string;
  groupId: string;
  groupSlug: string;
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

/** Where this device remembers the requests it has put away. */
const DISMISSED = "connectapp:groupRequestsPutAway";

/**
 * R9.5, R9.6. Finding a group.
 *
 * Built to docs/redesign/design: a box to type in, the count beside it, and
 * everything else behind one Filter button. A church has tens of groups, so the
 * filtering happens here and a dropdown costs no round trip.
 *
 * The cards carry a banner, the kind, whether it is taking members, the name,
 * when it meets and who leads it. That is the order somebody reads them in.
 */
export function Finder({
  church,
  from = "",
  groups,
  types,
  requests,
  canManage,
  putAway = false,
}: {
  church: string;
  /**
   * The query that brought the reader here, carried onto every group so its
   * own page can send them back to the list they came from rather than to the
   * kinds they started at.
   */
  from?: string;
  groups: FinderGroup[];
  types: FinderType[];
  requests: FinderRequest[];
  canManage: boolean;
  /** R9.2. The archived view: the same list, holding the groups put away. */
  putAway?: boolean;
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
  const [error, setError] = useFormError(open);
  const [dismissed, setDismissed] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();

  /*
   * R9.6. Put away stays put away.
   *
   * The ids that were dismissed are kept on this device, so the block does not
   * come back on the next visit. Only the ones that were there at the time:
   * somebody new asking is a new thing to answer, and it reopens.
   *
   * Browser storage, so every read and write is guarded. A browser that refuses
   * it is a browser that shows the block, which is the safe way round.
   */
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISSED);
      setDismissed(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setDismissed([]);
    }
  }, []);

  /* R9.6, R24.6. A join request is about a group somebody can join, so it
     has nothing to say on the list of the ones put away. */
  const waiting = putAway ? [] : requests.filter((one) => !dismissed.includes(one.id));

  const dismissRequests = () => {
    // Only the ids still asking, so the list cannot grow forever.
    const next = requests.map((one) => one.id);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED, JSON.stringify(next));
    } catch {
      // A browser that will not store it is a browser that asks again.
    }
  };

  const text = query.trim().toLowerCase();
  const all = groups.filter((group) => (putAway ? group.archived : !group.archived));

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

  const [order, setOrder] = useListPreference<GroupOrder>("groups.order", "name");
  const [view, setView] = useListPreference<ListView>("groups.view", "tiles");

  const shown = all
    .filter((group) => matches(group, chosen))
    .slice()
    .sort(BY_GROUP[order]);
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

      {/*
       * R9.6. What this person owes an answer to, above what they are browsing.
       *
       * Its own tint rather than another white card: it is the one thing on
       * this screen that is waiting on somebody, and a church that has three
       * members asking should see three members asking before it sees the groups.
       */}
      {waiting.length > 0 ? (
        <section className="overflow-hidden rounded-[14px] border border-[var(--hue-amber-500)]/20 bg-[var(--hue-amber-tint)]/40">
          <div className="flex items-center gap-2 px-5 pt-4 pb-2.5">
            <span className="text-[12px] font-bold tracking-[0.06em] text-[var(--hue-amber-key)] uppercase">
              {t("find.requests")}
            </span>
            <span className="text-[12px] font-semibold text-[var(--hue-amber-key)]/70">
              {waiting.length}
            </span>
            <span className="flex-1" />
            {/* Put away for now. It comes back on the next visit, and the
                moment somebody new asks. */}
            <IconButton
              label={t("find.dismiss")}
              variant="ghost"
              className="size-7"
              onClick={dismissRequests}
            >
              <X />
            </IconButton>
          </div>

          <ul className="flex flex-col">
            {waiting.map((request) => (
              <li
                key={request.id}
                className="relative flex min-h-[56px] flex-wrap items-center gap-3 border-t border-[var(--hue-amber-500)]/20 px-5 py-2"
              >
                <Avatar
                  name={request.personName}
                  id={request.id}
                  className="size-8 text-[11px] font-semibold"
                />
                <span className="flex min-w-0 flex-1 flex-col leading-5">
                  {/* The whole row opens the group, where the request sits
                      beside everything else about it. */}
                  <Link
                    href={`/groups/${request.groupSlug}?church=${church}`}
                    className="truncate font-medium text-fg after:absolute after:inset-0 focus-visible:outline-none"
                  >
                    {request.personName}
                  </Link>
                  <span className="truncate text-[13px] text-fg-muted">
                    {request.groupName}
                    {request.message ? ` · ${request.message}` : ""}
                  </span>
                </span>
                {/* Answered on the group's own page, where the roster and the
                    rest of the request are. This list is what is waiting. */}
              </li>
            ))}
          </ul>
        </section>
      ) : null}


      {/* With nothing to search through, the whole row is noise over an
          empty screen, so it waits until there is a first group. */}
      {all.length > 0 ? (
        /* The box, the count, and one Filter button on the right. */
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t("find.groupOrLeader")}
          />

          <span className="flex-1" />

          <SortMenu
            value={order}
            onChange={(next) => setOrder(next as GroupOrder)}
            options={[
              { value: "name", label: t("list.sort.name") },
              { value: "newest", label: t("list.sort.newest") },
              { value: "oldest", label: t("list.sort.oldest") },
              { value: "draftsFirst", label: t("list.sort.draftsFirst") },
            ]}
          />

          <ViewToggle value={view} onChange={setView} />

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

          {canManage && !putAway ? (
            <Button asChild className="h-[34px] min-h-0 gap-1.5 px-3 text-[13px]">
              <Link href={`/groups/new?church=${church}`}>
                <Plus className="size-4" aria-hidden /> {t("groups.add")}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {shown.length === 0 ? (
        /*
         * R24.17. Two different nothings. A church with no groups at all is on
         * its first week and is offered the way to write one down. A church
         * whose filters match nothing is offered the way back.
         */
        all.length === 0 ? (
          putAway ? (
            <Empty icon="group" title={t("groups.archived.none")} />
          ) : (
          <Empty
            icon="group"
            title={t("groups.none.title")}
            /* R9.5. The line tells whoever can make one to make one. A member
               reading an empty screen has already been told by the screen. */
            body={canManage ? t("groups.none.body") : undefined}
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
          )
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
        /* R9.5. Published leads, because that is what the congregation can
           see. Drafts sit under it with a hairline between, which is the shape
           the events list carries, and "drafts first" turns the pair round. */
        (order === "draftsFirst"
          ? [...BANDS].reverse()
          : BANDS
        )
          .map((band) => ({ ...band, rows: shown.filter((g) => g.status === band.key) }))
          .filter((band) => band.rows.length > 0)
          .map((band, at, bands) => (
            <GroupBand
              key={band.key}
              church={church}
              from={from}
              heading={bands.length > 1 ? band.heading() : null}
              rows={band.rows}
              view={view}
              rule={at > 0}
              onRestore={
                putAway
                  ? (id) => run(() => restore(id, church))
                  : undefined
              }
              pending={pending}
            />
          ))
      )}

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
function GroupCard({
  church, group, from, onRestore, pending,
}: {
  church: string;
  group: FinderGroup;
  from: string;
  /** R9.2. Set on the archived view, where a card has one thing to do. */
  onRestore?: (id: string) => void;
  pending?: boolean;
}) {
  const hue = group.typeHue ?? "sky";
  // Every leader, the same as the group's own page. A card naming one of two
  // leaders reads as a correction the moment the page is opened.
  const leader = group.leaderNames.join(", ");

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
          {group.status === "draft" ? (
            <span
              className="rounded-full px-2 py-0.5 text-[12px] font-medium"
              style={{ background: "var(--hue-amber-tint)", color: "var(--hue-amber-key)" }}
            >
              {t("event.status.draft")}
            </span>
          ) : null}
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

          {onRestore ? (
            /* Above the stretched link, so the card still opens the group and
               this stays a button. */
            <IconButton
              label={t("groups.restore")}
              variant="ghost"
              disabled={pending}
              onClick={() => onRestore(group.id)}
              className="relative z-10 -my-1 shrink-0"
            >
              <Undo2 />
            </IconButton>
          ) : null}
        </div>

        <Link
          href={`/groups/${group.slug}?church=${church}${from}`}
          className="font-display text-[22px] leading-[28px] text-fg after:absolute after:inset-0 focus-visible:outline-none"
        >
          {group.name}
        </Link>

        <div className="text-[13px] text-fg-muted">
          {leader ? t("find.ledBy", { meets: meets(group), leader }) : meets(group)}
        </div>

        {group.memberCount !== null ? (
          <div className="text-[13px] text-fg">
            <strong className="font-semibold">{group.memberCount}</strong>{" "}
            {t("groups.members").toLowerCase()}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * R9.5. The same group as one row.
 *
 * The list view, for a church with forty groups that wants to scan names and
 * days rather than look at forty pictures.
 */
function GroupRow({
  church, group, from, onRestore, pending,
}: {
  church: string;
  group: FinderGroup;
  from: string;
  onRestore?: (id: string) => void;
  pending?: boolean;
}) {
  const hue = group.typeHue ?? "sky";
  const leader = group.leaderNames.join(", ");

  return (
    <div className={`relative flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 ${LIFT}`}>
      {group.photoUrl ? (
        <img src={group.photoUrl} alt="" className="size-11 shrink-0 rounded-[10px] object-cover" />
      ) : (
        <span
          aria-hidden
          className="size-11 shrink-0 rounded-[10px]"
          style={{ background: `var(--hue-${hue}-tint)` }}
        />
      )}

      <div className="flex min-w-0 flex-[2_1_220px] flex-col">
        <Link
          href={`/groups/${group.slug}?church=${church}${from}`}
          className="truncate font-medium text-fg after:absolute after:inset-0 focus-visible:outline-none"
        >
          {group.name}
        </Link>
        <span className="truncate text-[13px] text-fg-muted">
          {leader ? t("find.ledBy", { meets: meets(group), leader }) : meets(group)}
        </span>
      </div>

      {/* R24.6. The marks run together under the name on a phone, where
          there is no room for them beside it. */}
      <span className="flex basis-full items-center gap-3 pl-[60px] sm:basis-auto sm:pl-0">
        {group.status === "draft" ? (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium"
            style={{ background: "var(--hue-amber-tint)", color: "var(--hue-amber-key)" }}
          >
            {t("event.status.draft")}
          </span>
        ) : null}

        {group.memberCount !== null ? (
          <span className="shrink-0 text-[13px] text-fg-muted tabular-nums">
            {plural("publicGroups.size", group.memberCount)}
          </span>
        ) : null}

        <span
          className="shrink-0 text-[12px] font-medium"
          style={{ color: group.openToJoin && !group.full ? "var(--hue-fern-key)" : "var(--fg-muted)" }}
        >
          {group.full ? t("find.full") : group.openToJoin ? t("find.open") : t("find.closed")}
        </span>

        {onRestore ? (
          <IconButton
            label={t("groups.restore")}
            variant="ghost"
            disabled={pending}
            onClick={() => onRestore(group.id)}
            className="relative z-10 shrink-0"
          >
            <Undo2 />
          </IconButton>
        ) : null}
      </span>
    </div>
  );
}

/** One band, which draws as much of itself as anybody has asked for. */
function GroupBand({
  church,
  from,
  heading,
  rows,
  view,
  rule,
  onRestore,
  pending,
}: {
  church: string;
  from: string;
  heading: string | null;
  rows: FinderGroup[];
  view: ListView;
  /** A hairline above, for every band after the first. */
  rule: boolean;
  /** R9.2. Set on the archived view, which carries the way back. */
  onRestore?: (id: string) => void;
  pending?: boolean;
}) {
  const { limit, hidden, more } = useShowMore(rows.length);
  const shown = rows.slice(0, limit);

  return (
    <section
      className={
        rule ? "flex flex-col gap-3.5 border-t border-line pt-6" : "flex flex-col gap-3.5"
      }
    >
      {heading ? (
        <h2 className="text-[13px] font-bold tracking-wide text-fg uppercase">{heading}</h2>
      ) : null}

      {view === "tiles" ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))]">
          {shown.map((group) => (
            <GroupCard
              key={group.id}
              church={church}
              group={group}
              from={from}
              onRestore={onRestore}
              pending={pending}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-surface">
          {shown.map((group) => (
            <div key={group.id} className="border-b border-line last:border-b-0">
              <GroupRow
                church={church}
                group={group}
                from={from}
                onRestore={onRestore}
                pending={pending}
              />
            </div>
          ))}
        </div>
      )}

      <ShowMore hidden={hidden} onClick={more} />
    </section>
  );
}
