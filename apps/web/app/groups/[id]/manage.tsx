"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Banner, Button, Card } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { archive } from "../actions";
import { GroupDialog, ArchiveDialog, type GroupDraft, type GroupTypeOption } from "../group-form";

/**
 * R9.1 to R9.4, R9.7. The half of a group's page only its church sees.
 *
 * The roster, the night it meets, and the register. It sits under the public
 * half rather than on a screen of its own, because a leader opening a group is
 * looking at the same group a member is.
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
    <Card className="mt-10 flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("groups.title")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center gap-2">
        <GroupDialog
          church={church}
          types={types}
          group={group}
          pending={pending}
          title={t("groups.editTitle", { name: group.name })}
          trigger={<Button variant="secondary"><Pencil /> {t("groups.edit")}</Button>}
        />
        <ArchiveDialog
          name={group.name}
          pending={pending}
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
    </Card>
  );
}
