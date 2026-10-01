"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Avatar, Badge, Card, Input } from "@hearth/ui";
import { t } from "@hearth/i18n";

export interface DirectoryEntry {
  id: string;
  name: string;
  isChild: boolean;
  email: string | null;
  phone: string | null;
  address: string | null;
  birthday: string | null;
}

export interface DirectoryHousehold {
  id: string;
  name: string;
  people: DirectoryEntry[];
}

const birthday = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long" });

/**
 * R3.1. The church, by household.
 *
 * Searching happens here rather than on the server: a church of 50 to 500 fits
 * in a page, and somebody looking for the Bennetts should not wait for a round
 * trip to find them.
 */
export function Households({
  church,
  households,
}: {
  church: string;
  households: DirectoryHousehold[];
}) {
  const [query, setQuery] = React.useState("");
  const text = query.trim().toLowerCase();

  const shown = text
    ? households.filter(
        (household) =>
          household.name.toLowerCase().includes(text) ||
          household.people.some((person) => person.name.toLowerCase().includes(text)),
      )
    : households;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-3 shadow-sm transition-colors has-[input:focus]:border-fg">
        <Search className="size-5 shrink-0 text-fg-muted" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("memberDirectory.search")}
          autoComplete="off"
          className="border-0 bg-transparent shadow-none outline-none focus-visible:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((household) => (
          <Card key={household.id} className="flex flex-col gap-3">
            <span className="text-heading text-fg">{household.name}</span>

            {household.people.map((person) => (
              <div key={person.id} className="flex items-start gap-3">
                <Avatar name={person.name} id={person.id} />
                <span className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[length:var(--d-text-body)] text-fg">{person.name}</span>
                    {person.isChild ? (
                      <Badge tone="neutral">{t("memberDirectory.child")}</Badge>
                    ) : null}
                  </span>
                  {person.email ? (
                    <a
                      href={`mailto:${person.email}`}
                      className="text-caption text-fg-muted underline-offset-4 hover:text-fg hover:underline"
                    >
                      {person.email}
                    </a>
                  ) : null}
                  {person.phone ? (
                    <a
                      href={`tel:${person.phone}`}
                      className="text-caption text-fg-muted underline-offset-4 hover:text-fg hover:underline"
                    >
                      {person.phone}
                    </a>
                  ) : null}
                  {person.birthday ? (
                    <span className="text-caption text-fg-muted">{birthday(person.birthday)}</span>
                  ) : null}
                </span>
              </div>
            ))}

            {household.people.find((person) => person.address)?.address ? (
              <span className="text-caption text-fg-muted">
                {household.people.find((person) => person.address)!.address}
              </span>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
