"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { ArchiveTeamDialog } from "../team-dialog";
import { archiveTeam } from "../actions";

/** R10.1. Putting a team away, from the team itself. */
export function ArchiveTeam({
  church,
  id,
  name,
}: {
  church: string;
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const archive = () => {
    const data = new FormData();
    data.set("church", church);
    data.set("id", id);
    data.set("archived", "true");
    startTransition(async () => {
      const result = await archiveTeam(data);
      setError(result.error);
      if (!result.error) router.push(`/settings/teams?church=${church}`);
    });
  };

  return (
    <>
      <ArchiveTeamDialog name={name} pending={pending} onConfirm={archive} />
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}
    </>
  );
}
