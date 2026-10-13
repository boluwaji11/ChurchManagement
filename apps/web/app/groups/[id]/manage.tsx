"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Archive } from "lucide-react";
import Link from "next/link";
import { Banner, IconButton, Tooltip } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { archive } from "../actions";
import { ArchiveDialog, type GroupDraft } from "../group-form";

/**
 * R9.1 to R9.4. What the church may do to a group, in the corner.
 *
 * Two icons rather than two worded buttons: they sit where every other record
 * page carries its actions, and a group's page is already carrying its name,
 * its banner and three tabs without them.
 */
export function ManageGroup({
  group,
  only,
}: {
  group: GroupDraft;
  /**
   * R24.6. Which of the two to draw. Editing rides the window's row of marks;
   * archiving sits on its footer, at the far left, away from everything that
   * is pressed often.
   */
  only?: "edit" | "archive";
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex items-center gap-1" aria-busy={pending}>
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {only === "archive" ? null : (
      /* A link rather than a button, because it opens a screen. Shaped from
          the same tokens the IconButton beside it uses, so the pair reads as
          one, and carrying this product's own tooltip rather than the grey one
          the operating system draws. */
      <Tooltip content={t("groups.edit")}>
        <Link
          href={`/groups/${group.slug}/edit`}
          aria-label={t("groups.edit")}
          className="inline-flex size-[var(--d-tap)] shrink-0 items-center justify-center rounded-[var(--d-radius-control)] text-fg-muted transition-colors hover:bg-sunken hover:text-fg [&_svg]:size-[var(--d-icon)]"
        >
          <Pencil />
        </Link>
      </Tooltip>
      )}

      {only === "edit" ? null : (
      <ArchiveDialog
        name={group.name}
        pending={pending}
        trigger={
          <IconButton label={t("groups.archive")} variant="ghost">
            <Archive />
          </IconButton>
        }
        onConfirm={() => {
          const data = new FormData();
          data.set("id", group.id);
          data.set("archived", "true");
          startTransition(async () => {
            const result = await archive(data);
            setError(result.error);
            if (!result.error) router.push("/groups");
          });
        }}
      />
      )}
    </div>
  );
}
