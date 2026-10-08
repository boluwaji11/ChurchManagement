"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, ListFilter } from "lucide-react";
import { IconButton } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { archiveList } from "./list-actions";

export interface ArchivedList {
  id: string;
  name: string;
  kind: "static" | "rule";
}

/**
 * R1.14. The saved lists that have been put away, and the way to bring one back.
 *
 * A list lives inside the directory rather than on a screen of its own, so this
 * is the directory's own archived view, reached by the link at its foot.
 */
export function ArchivedLists({
  church,
  lists,
}: {
  church: string;
  lists: ArchivedList[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const restore = (id: string) =>
    startTransition(async () => {
      const result = await archiveList(id, false, church);
      setError(result.error);
      if (!result.error) router.refresh();
    });

  return (
    <section className="flex flex-col gap-3" aria-busy={pending}>
      <h2 className="font-display text-[22px] leading-7 text-fg">{t("lists.archived.title")}</h2>

      {error ? (
        <p role="status" className="text-[13px] text-danger-text">
          {error}
        </p>
      ) : null}

      {lists.length === 0 ? (
        <p className="text-fg-muted">{t("lists.archived.none")}</p>
      ) : (
        <ul className="flex list-none flex-col overflow-hidden rounded-lg border border-line bg-surface p-0">
          {lists.map((one) => (
            <li
              key={one.id}
              className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
            >
              <ListFilter className="size-4 text-fg-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-medium text-fg">{one.name}</span>
              <IconButton
                label={t("lists.restore")}
                variant="ghost"
                disabled={pending}
                onClick={() => restore(one.id)}
              >
                <ArchiveRestore />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
