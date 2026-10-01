"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import {
  Badge, Banner, Button, Card, EmptyState, HueDot, Input, Separator,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
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
  location: string | null;
  memberCount: number;
  openToJoin: boolean;
  full: boolean;
  mine: boolean;
  requested: string | null;
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
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
};

/**
 * R9.5, R9.6. Finding a group, and the answers a leader owes.
 *
 * The filters are the three things somebody actually asks: what kind of group,
 * which night, and whereabouts. Filtering happens here rather than on the
 * server, because a church has tens of groups and a round trip for a dropdown
 * is a round trip nobody needs.
 */
export function Finder({
  church,
  groups,
  types,
  requests,
}: {
  church: string;
  groups: FinderGroup[];
  types: { id: string; name: string; hue: string }[];
  requests: FinderRequest[];
}) {
  const router = useRouter();
  const [type, setType] = React.useState(ANY);
  const [day, setDay] = React.useState(ANY);
  const [where, setWhere] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const shown = groups.filter(
    (group) =>
      (type === ANY || group.typeId === type) &&
      (day === ANY || String(group.dayOfWeek) === day) &&
      (where.trim() === "" ||
        (group.location ?? "").toLowerCase().includes(where.trim().toLowerCase())),
  );

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
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

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-40 flex-col gap-1.5">
          <span className="text-label text-fg">{t("find.type")}</span>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger aria-label={t("find.type")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("find.anyType")}</SelectItem>
              {types.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <span className="flex items-center gap-2">
                    <HueDot hue={option.hue as Hue} />
                    {option.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-40 flex-col gap-1.5">
          <span className="text-label text-fg">{t("find.day")}</span>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger aria-label={t("find.day")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("find.anyDay")}</SelectItem>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <SelectItem key={d} value={String(d)}>{dayName(d)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-40 flex-1 flex-col gap-1.5">
          <span className="text-label text-fg">{t("find.where")}</span>
          <Input value={where} onChange={(e) => setWhere(e.target.value)} autoComplete="off" />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState title={t("find.none.title")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shown.map((group) => (
            <Card key={group.id} className="flex flex-col gap-2">
              <span className="flex flex-wrap items-center gap-2">
                {group.typeHue ? <HueDot hue={group.typeHue as Hue} /> : null}
                <span className="text-heading text-fg">{group.name}</span>
              </span>

              <span className="text-[length:var(--d-text-body)] text-fg-muted">
                {group.dayOfWeek !== null && group.startsAt
                  ? `${dayName(group.dayOfWeek)} ${readableTime(group.startsAt)}`
                  : null}
                {group.location ? ` ${group.location}` : ""}
              </span>

              {group.description ? (
                <span className="text-caption text-fg-muted">{group.description}</span>
              ) : null}

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
                  <Button
                    disabled={pending}
                    onClick={() => run(() => ask(group.id, null, church))}
                  >
                    {t("find.join")}
                  </Button>
                )}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
