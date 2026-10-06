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

/** "Eastern" where a church would say that, and "Lagos, Africa" everywhere else. */
function zoneLabel(zone: string): string {
  if ((FRIENDLY as readonly string[]).includes(zone)) return t(`tz.${zone}` as never);
  const [region, ...rest] = zone.split("/");
  const city = rest.join(" / ").replace(/_/g, " ");
  return city ? `${city}, ${(region ?? "").replace(/_/g, " ")}` : zone;
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
    const rest = allZones()
      .filter((z) => !(FRIENDLY as readonly string[]).includes(z))
      .map((z): [string, string] => [z, zoneLabel(z)])
      .sort((a, b) => a[1].localeCompare(b[1]));
    const head = FRIENDLY.map((z): [string, string] => [z, zoneLabel(z)]);
    const all = [...head, ...rest];
    return all.some(([z]) => z === zone) ? all : [...all, [zone, zoneLabel(zone)] as [string, string]];
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
