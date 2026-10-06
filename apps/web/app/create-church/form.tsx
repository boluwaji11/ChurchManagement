"use client";

import * as React from "react";
import { Church } from "lucide-react";
import {
  Button, Input, Field, Banner,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { createChurchAccount } from "./actions";

/**
 * Timezone is not a detail. A service day is local, the no-deploy window is
 * local, and a giving statement's year end is local. The browser knows the
 * answer, so it is filled in and shown rather than asked for.
 *
 * Every zone the runtime knows, not the seven in the United States. A church in
 * Lagos or Manila is the point of the product, and the list is long enough that
 * the picker gives itself a box to type in.
 */
const FRIENDLY = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix",
  "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
] as const;

const FALLBACK = "America/Chicago";

function detect(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/** Every zone the runtime knows, minus the offset aliases nobody looks for. */
function allZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone").filter(
      (z) => z.includes("/") && !z.startsWith("Etc/"),
    );
  } catch {
    return [...FRIENDLY];
  }
}

/**
 * "GMT+01:00" for a zone, which is the half of the answer a reader recognises.
 *
 * IANA names a zone after a city, because a city is what keeps the same clock
 * through a century of rule changes. Nobody looks for "Africa/Lagos", they look
 * for an offset, so the offset leads and the city says which one of the several
 * on that offset this is.
 */
function offsetOf(zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  } catch {
    return "GMT";
  }
}

/** Minutes east of GMT, for sorting the list the way a reader expects it. */
function offsetRank(offset: string): number {
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(offset);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** "(GMT-06:00) Central" where a church would say that, "(GMT+01:00) Lagos" elsewhere. */
function zoneName(zone: string): string {
  if ((FRIENDLY as readonly string[]).includes(zone)) return t(`tz.${zone}` as never);
  const [, ...rest] = zone.split("/");
  return rest.join(" / ").replace(/_/g, " ") || zone;
}

export function CreateChurchForm() {
  const [name, setName] = React.useState("");
  const [zone, setZone] = React.useState(FALLBACK);
  const [nameError, setNameError] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);

  // Runs after hydration, so the server and the client render the same thing.
  React.useEffect(() => setZone(detect()), []);

  /*
   * The seven a church in the United States reads by name first, then the world
   * in alphabetical order. Whatever the browser reported is in there already,
   * and is what the field opens on.
   */
  const zones = React.useMemo(() => {
    const draw = (z: string): [string, string] => {
      const offset = offsetOf(z);
      return [z, `(${offset}) ${zoneName(z)}`];
    };
    const rest = allZones()
      .filter((z) => !(FRIENDLY as readonly string[]).includes(z))
      .map(draw)
      .sort(
        (a, b) =>
          offsetRank(a[1].slice(1, a[1].indexOf(")"))) -
            offsetRank(b[1].slice(1, b[1].indexOf(")"))) || a[1].localeCompare(b[1]),
      );
    const head = FRIENDLY.map(draw);
    const all = [...head, ...rest];
    return all.some(([z]) => z === zone) ? all : [...all, draw(zone)];
  }, [zone]);

  const action = async (data: FormData) => {
    setError(undefined);
    if (name.trim().length < 2) {
      setNameError(t("validate.churchName"));
      return;
    }
    setNameError(undefined);
    setPending(true);
    try {
      const result = await createChurchAccount(data);
      if (result?.error) setError(result.error);
    } finally {
      setPending(false);
    }
  };

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {error ? <Banner tone="danger" title={t("createChurch.failed")}>{error}</Banner> : null}

      <Field label={t("createChurch.name")} error={nameError} required>
        <Input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="organization"
          autoFocus
        />
      </Field>

      <Field label={t("createChurch.timezone")}>
        <Select name="timezone" value={zone} onValueChange={setZone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent searchLabel={t("createChurch.searchZone")}>
            {zones.map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Button type="submit" full loading={pending}>
        <Church /> {t("createChurch.submit")}
      </Button>
    </form>
  );
}
