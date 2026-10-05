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
 * Timezone is not a detail. A service day is local, the no-deploy window is local, and
 * a giving statement's year end is local. The browser knows the answer, so it is
 * filled in and shown rather than asked for.
 */
const ZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix",
  "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
] as const;

function detect(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
  } catch {
    return "America/Chicago";
  }
}

export function CreateChurchForm() {
  const [name, setName] = React.useState("");
  const [zone, setZone] = React.useState("America/Chicago");
  const [nameError, setNameError] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);

  // Runs after hydration, so the server and the client render the same thing.
  React.useEffect(() => setZone(detect()), []);

  const zones: [string, string][] = ZONES.map((z) => [z, t(`tz.${z}`)]);
  // A church outside the listed zones keeps the one the browser reported.
  if (!ZONES.some((z) => z === zone)) zones.push([zone, zone.replace(/_/g, " ")]);

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
          placeholder={t("createChurch.namePlaceholder")}
        />
      </Field>

      <Field label={t("createChurch.timezone")}>
        <Select name="timezone" value={zone} onValueChange={setZone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
