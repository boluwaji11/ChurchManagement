"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banner, Field, Input } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { Campus } from "@connectapp/db";
import { renameSite } from "./places-actions";

/**
 * R1.2. Where this church meets.
 *
 * One campus, named. No campus picker anywhere: a church of 180 has one site,
 * and a question with one answer is not a question. Every person, household,
 * team, group and check-in room carries this campus, so the name is the one
 * thing worth editing. The schema holds the shape for the day that changes.
 *
 * The places inside a campus come back with facility booking (R15.4), which is
 * where a place is the thing somebody reserves a room inside.
 */
export function Places({
  church,
  campus,
  canEdit,
  editing,
}: {
  church: string;
  campus: Campus | null;
  canEdit: boolean;
  /** Driven by the pencil on Details, so one press opens the whole page. */
  editing: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [site, setSite] = React.useState(campus?.name ?? "");
  const [pending, startTransition] = React.useTransition();

  if (!campus) return null;

  const save = () =>
    startTransition(async () => {
      const result = await renameSite(campus.id, site, church);
      setError(result.error);
      if (!result.error) router.refresh();
    });

  return (
    <section
      className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5"
      aria-busy={pending}
    >
      {error ? <Banner tone="danger" title={t("place.failed")}>{error}</Banner> : null}

      <span className="font-semibold text-fg">{t("place.title")}</span>

      {editing && canEdit ? (
        <Field label={t("place.campus")} required>
          <Input
            value={site}
            onChange={(e) => setSite(e.target.value)}
            onBlur={save}
            autoComplete="off"
          />
        </Field>
      ) : (
        <div className="flex flex-col gap-0.5">
          <span className="text-label text-fg-subtle">{t("place.campus")}</span>
          <span className="text-[length:var(--d-text-body)] text-fg">{campus.name}</span>
        </div>
      )}
    </section>
  );
}
