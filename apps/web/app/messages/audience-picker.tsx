"use client";

import * as React from "react";
import { Card, CardTitle, Separator, Banner } from "@hearth/ui";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { AUDIENCE_KINDS, type AudienceKind } from "@hearth/db/rules";
import { audienceSize } from "./actions";

export interface PickerOption {
  id: string;
  name: string;
  count: number;
}

export interface PickerOptions {
  lists: PickerOption[];
  groups: PickerOption[];
  teams: PickerOption[];
  pipelines: PickerOption[];
  tags: PickerOption[];
  statuses: PickerOption[];
}

/**
 * R16.5. Who the message goes to.
 *
 * The count is the point. Somebody picking the wrong group finds out here,
 * rather than four hundred people finding out for them.
 */
export function AudiencePicker({
  church,
  options,
}: {
  church: string;
  options: PickerOptions;
}) {
  const [kind, setKind] = React.useState<AudienceKind>("everybody");
  const [id, setId] = React.useState<string>("");
  const [size, setSize] = React.useState<{
    total: number;
    reachable: number;
    noEmail: number;
    error?: string;
  } | null>(null);

  const choices: Record<AudienceKind, PickerOption[]> = {
    everybody: [],
    list: options.lists,
    group: options.groups,
    team: options.teams,
    pipeline: options.pipelines,
    tag: options.tags,
    status: options.statuses,
  };

  const forKind = choices[kind] ?? [];

  React.useEffect(() => {
    if (kind !== "everybody" && !id) {
      setSize(null);
      return;
    }
    let live = true;
    audienceSize({ kind, id: kind === "everybody" ? null : id }, church).then((found) => {
      if (live) setSize(found);
    });
    return () => { live = false; };
  }, [kind, id, church]);

  return (
    <Card>
      <CardTitle>{t("audience.title")}</CardTitle>
      <Separator className="my-4" />

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("audience.kind")}</span>
            <Select
              value={kind}
              onValueChange={(next) => {
                setKind(next as AudienceKind);
                setId("");
              }}
            >
              <SelectTrigger aria-label={t("audience.kind")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIENCE_KINDS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`audience.kind.${option}` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {kind === "everybody" ? null : (
            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("audience.which")}</span>
              <Select value={id} onValueChange={setId}>
                <SelectTrigger aria-label={t("audience.which")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {forKind.map((option: PickerOption) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name} ({plural("audience.holds", option.count)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {size?.error ? (
          <Banner tone="danger" title={size.error} />
        ) : size ? (
          <div className="flex flex-wrap items-baseline gap-4">
            <span className="font-display text-heading text-fg tabular-nums">
              {plural("audience.reach", size.reachable)}
            </span>
            {size.noEmail > 0 ? (
              <span className="text-caption text-warning-text tabular-nums">
                {plural("audience.noEmail", size.noEmail)}
              </span>
            ) : null}
            {size.total === 0 ? (
              <span className="text-caption text-fg-muted">{t("audience.nobody")}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
