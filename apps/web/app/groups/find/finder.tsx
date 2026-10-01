"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X, Search } from "lucide-react";
import {
  Badge, Banner, Button, Card, Checkbox, EmptyState, HueDot, Input, Separator,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { ask, decide } from "./actions";

export interface FinderGroup {
  id: string;
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
  openToJoin: boolean;
  full: boolean;
  mine: boolean;
  requested: string | null;
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

const ANY = "any";

const dayName = (day: number) => {
  const d = new Date(2024, 0, 7 + day);
  return d.toLocaleDateString(undefined, { weekday: "long" });
};

const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
};

/** "Tuesdays, 7:30pm to 9:00pm", which is how somebody reads it out. */
function meets(group: FinderGroup): string {
  if (group.dayOfWeek === null) return group.location ?? "";
  const day = `${dayName(group.dayOfWeek)}s`;
  if (!group.startsAt) return day;
  const span = group.endsAt
    ? `${readableTime(group.startsAt)} to ${readableTime(group.endsAt)}`
    : readableTime(group.startsAt);
  return `${day}, ${span}`;
}

/**
 * R9.5, R9.6. Finding a group, and the answers a leader owes.
 *
 * Browsing is by kind first, because the question somebody arrives with is
 * "what does this church have" before it is "which one". Each kind says what it
 * is in the church's own words and how many of it are open, and the groups sit
 * under it.
 *
 * The filters are the ones people actually use: a box to type in, the night,
 * who it is for, whether it meets online, and whether children are welcome.
 * Filtering happens here rather than on the server, because a church has tens
 * of groups and a round trip for a dropdown is a round trip nobody needs.
 */
export function Finder({
  church,
  groups,
  types,
  requests,
}: {
  church: string;
  groups: FinderGroup[];
  types: FinderType[];
  requests: FinderRequest[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState(ANY);
  const [day, setDay] = React.useState(ANY);
  const [forWhom, setForWhom] = React.useState(ANY);
  const [online, setOnline] = React.useState(false);
  const [withChildren, setWithChildren] = React.useState(false);
  const [includeShut, setIncludeShut] = React.useState(true);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const text = query.trim().toLowerCase();
  const shown = groups.filter(
    (group) =>
      (type === ANY || group.typeId === type) &&
      (day === ANY || String(group.dayOfWeek) === day) &&
      (forWhom === ANY || group.forWhom === forWhom) &&
      (!online || group.online) &&
      (!withChildren || group.childrenWelcome) &&
      (includeShut || (group.openToJoin && !group.full) || group.mine) &&
      (text === "" ||
        group.name.toLowerCase().includes(text) ||
        (group.description ?? "").toLowerCase().includes(text) ||
        (group.location ?? "").toLowerCase().includes(text)),
  );

  const sections = types
    .map((kind) => ({ kind, found: shown.filter((g) => g.typeId === kind.id) }))
    .filter((section) => section.found.length > 0);
  const loose = shown.filter((g) => !types.some((kind) => kind.id === g.typeId));

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("find.title")}>{error}</Banner> : null}

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
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => decide(request.id, true, church))}
                  >
                    <Check /> {t("find.approve")}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => decide(request.id, false, church))}
                  >
                    <X /> {t("find.decline")}
                  </Button>
                </span>
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-3 shadow-sm transition-colors has-[input:focus]:border-fg">
          <Search className="size-5 shrink-0 text-fg-muted" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("find.search")}
            autoComplete="off"
            className="border-0 bg-transparent shadow-none outline-none focus-visible:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Filter label={t("find.type")} value={type} onChange={setType} any={t("find.anyType")}
            options={types.map((k) => ({ value: k.id, label: k.name, hue: k.hue }))} />

          <Filter label={t("find.day")} value={day} onChange={setDay} any={t("find.anyDay")}
            options={[0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: dayName(d) }))} />

          <Filter label={t("find.forWhom")} value={forWhom} onChange={setForWhom}
            any={t("find.anyone")}
            options={(["men", "women", "young_adults", "students", "parents", "seniors"] as const)
              .map((a) => ({ value: a, label: t(`groups.audience.${a}` as never) }))} />
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <Toggle label={t("find.online")} checked={online} onChange={setOnline} />
          <Toggle label={t("find.children")} checked={withChildren} onChange={setWithChildren} />
          <Toggle label={t("find.includeShut")} checked={includeShut} onChange={setIncludeShut} />
        </div>
      </div>

      {shown.length === 0 ? <EmptyState title={t("find.none.title")} /> : null}

      {sections.map(({ kind, found }) => (
        <section key={kind.id} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <HueDot hue={kind.hue as Hue} />
              <h2 className="font-display text-heading text-fg">{kind.name}</h2>
              <Badge tone="neutral">{plural("find.open", found.filter((g) => g.openToJoin && !g.full).length)}</Badge>
            </span>
            {kind.description ? (
              <p className="max-w-2xl text-[length:var(--d-text-body)] text-fg-muted">
                {kind.description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {found.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                pending={pending}
                onAsk={() => run(() => ask(group.id, null, church))}
              />
            ))}
          </div>
        </section>
      ))}

      {loose.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {loose.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              pending={pending}
              onAsk={() => run(() => ask(group.id, null, church))}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  any,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  any: string;
  options: { value: string; label: string; hue?: string }[];
}) {
  return (
    <div className="flex min-w-40 flex-col gap-1.5">
      <span className="text-label text-fg">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{any}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.hue ? (
                <span className="flex items-center gap-2">
                  <HueDot hue={option.hue as Hue} />
                  {option.label}
                </span>
              ) : (
                option.label
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={(on) => onChange(on === true)} />
      <span className="text-[length:var(--d-text-body)] text-fg">{label}</span>
    </label>
  );
}

function GroupCard({
  group,
  pending,
  onAsk,
}: {
  group: FinderGroup;
  pending: boolean;
  onAsk: () => void;
}) {
  return (
    <Card className="flex flex-col gap-2">
      <span className="text-heading text-fg">{group.name}</span>

      <span className="text-[length:var(--d-text-body)] text-fg-muted">
        {meets(group)}
        {group.dayOfWeek !== null && group.location ? ` ${group.location}` : ""}
      </span>

      {group.description ? (
        <span className="line-clamp-3 text-caption text-fg-muted">{group.description}</span>
      ) : null}

      <span className="flex flex-wrap items-center gap-2">
        {group.forWhom && group.forWhom !== "anyone" ? (
          <Badge tone="neutral">{t(`groups.audience.${group.forWhom}` as never)}</Badge>
        ) : null}
        {group.online ? <Badge tone="neutral">{t("groups.online")}</Badge> : null}
        {group.childrenWelcome ? (
          <Badge tone="neutral">{t("groups.childrenWelcome")}</Badge>
        ) : null}
      </span>

      <span className="flex flex-wrap items-center gap-2">
        {group.mine ? (
          <Badge tone="success">{t("find.member")}</Badge>
        ) : group.requested === "pending" ? (
          <Badge tone="neutral">{t("find.asked")}</Badge>
        ) : group.requested === "approved" ? (
          <Badge tone="success">{t("find.approved")}</Badge>
        ) : group.requested === "declined" ? (
          <Badge tone="neutral">{t("find.declined")}</Badge>
        ) : group.full ? (
          <Badge tone="warning">{t("find.full")}</Badge>
        ) : !group.openToJoin ? (
          <Badge tone="neutral">{t("find.closed")}</Badge>
        ) : (
          <Button disabled={pending} onClick={onAsk}>{t("find.join")}</Button>
        )}
      </span>
    </Card>
  );
}
