"use client";

import * as React from "react";
import { Church } from "lucide-react";
import {
  Button, Input, Field, Banner,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { createChurchAccount } from "./actions";

/**
 * Timezone is not a detail. Sunday is local, the no-deploy window is local, and
 * a giving statement's year end is local. The browser knows the answer, so it is
 * filled in and shown rather than asked for.
 */
const ZONES = [
  ["America/New_York", "Eastern"],
  ["America/Chicago", "Central"],
  ["America/Denver", "Mountain"],
  ["America/Phoenix", "Arizona"],
  ["America/Los_Angeles", "Pacific"],
  ["America/Anchorage", "Alaska"],
  ["Pacific/Honolulu", "Hawaii"],
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

  const zones = ZONES.some(([v]) => v === zone) ? ZONES : [...ZONES, [zone, zone.replace(/_/g, " ")] as const];

  const action = async (data: FormData) => {
    setError(undefined);
    if (name.trim().length < 2) {
      setNameError("Enter the name of your church.");
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
      {error ? <Banner tone="danger" title="Not created">{error}</Banner> : null}

      <Field label="Church name" error={nameError} required>
        <Input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="organization"
          autoFocus
          placeholder="Riverside Fellowship"
        />
      </Field>

      <Field label="Timezone">
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
        <Church /> Create it
      </Button>
    </form>
  );
}
