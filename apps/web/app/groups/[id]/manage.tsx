"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Archive, Eye } from "lucide-react";
import Link from "next/link";
import { Banner, Button, IconButton } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { archive } from "../actions";
import { ArchiveDialog, type GroupDraft, type GroupTypeOption } from "../group-form";

/**
 * R9.1 to R9.4. What the church may do to a group, in the corner.
 *
 * Two icons rather than two worded buttons: they sit where every other record
 * page carries its actions, and a group's page is already carrying its name,
 * its banner and three tabs without them.
 */
export function ManageGroup({
  church,
  group,
  types,
}: {
  church: string;
  group: GroupDraft;
  types: GroupTypeOption[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex items-center gap-1" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("groups.title")}>{error}</Banner> : null}

      {/* R9.5. The public page in a tab of its own, so a draft can be looked
          at the way the congregation will see it. */}
      <Button variant="secondary" asChild className="h-[34px] min-h-0 px-3 text-[13px]">
        <Link
          href={`/groups/${group.slug}/preview?church=${church}`}
          target="_blank"
          rel="noreferrer"
        >
          <Eye className="size-4" aria-hidden /> {t("event.preview")}
        </Link>
      </Button>

      {/* A link rather than a button, because it opens a page. Shaped from the
          same tokens the IconButton beside it uses, so the pair reads as one. */}
      <Link
        href={`/groups/${group.slug}/edit?church=${church}`}
        aria-label={t("groups.edit")}
        title={t("groups.edit")}
        className="inline-flex size-[var(--d-tap)] shrink-0 items-center justify-center rounded-[var(--d-radius-control)] text-fg-muted transition-colors hover:bg-sunken hover:text-fg [&_svg]:size-[var(--d-icon)]"
      >
        <Pencil />
      </Link>

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
          data.set("church", church);
          data.set("id", group.id);
          data.set("archived", "true");
          startTransition(async () => {
            const result = await archive(data);
            setError(result.error);
            if (!result.error) router.push(`/groups?church=${church}`);
          });
        }}
      />
    </div>
  );
}
