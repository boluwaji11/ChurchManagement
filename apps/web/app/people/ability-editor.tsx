"use client";

import * as React from "react";
import { Banner, Checkbox, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { toggleAbility } from "./ability-actions";

export interface AbilityOption {
  id: string;
  kind: string;
  name: string;
}

/**
 * R2.9. What this person can do, cares about, and is gifted in.
 *
 * Toggles grouped by list, for the same reason tagging is: a church has tens of
 * these and a volunteer reads faster than they type. The grouping matters more
 * here, because the three lists are three different questions and a church that
 * uses gifting language will not find its gifts in a pile of skills.
 */
export function AbilityEditor({
  church,
  personId,
  all,
  assigned,
  canEdit,
}: {
  church: string;
  personId: string;
  all: AbilityOption[];
  assigned: string[];
  canEdit: boolean;
}) {
  const [on, setOn] = React.useState<string[]>(assigned);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const kinds = [...new Set(all.map((a) => a.kind))];

  if (all.length === 0) {
    return <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("ability.personEmpty")}</p>;
  }

  if (!canEdit) {
    const mine = all.filter((a) => on.includes(a.id));
    if (mine.length === 0) {
      return <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("ability.personEmpty")}</p>;
    }
    return (
      <ul className="flex flex-wrap gap-2">
        {mine.map((a) => (
          <li
            key={a.id}
            className="rounded-full border border-line px-3 py-1 text-caption text-fg-muted"
          >
            {a.name}
          </li>
        ))}
      </ul>
    );
  }

  const toggle = (id: string, next: boolean) => {
    setOn((held) => (next ? [...held, id] : held.filter((x) => x !== id)));
    startTransition(async () => {
      const result = await toggleAbility(personId, id, next, church);
      if (result.error) {
        setError(result.error);
        setOn((held) => (next ? held.filter((x) => x !== id) : [...held, id]));
      }
    });
  };

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("ability.title")}>{error}</Banner> : null}

      {kinds.map((kind, i) => (
        <div key={kind} className="flex flex-col gap-2">
          {i > 0 ? <Separator /> : null}
          <span className="text-label text-fg-muted">{t(`ability.kind.${kind}.plural` as never)}</span>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {all
              .filter((a) => a.kind === kind)
              .map((a) => (
                <li key={a.id}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={on.includes(a.id)}
                      onCheckedChange={(next) => toggle(a.id, next === true)}
                    />
                    <span className="text-[length:var(--d-text-body)] text-fg">{a.name}</span>
                  </label>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
