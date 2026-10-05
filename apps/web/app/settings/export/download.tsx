"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Banner, IconButton, Working } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R19.8. One row of the export table, and the wait it puts on the screen.
 *
 * An archive of every person, household and attendance record takes a few
 * seconds to build, and a plain download link spends those seconds looking
 * broken. Fetching the file ourselves means the screen can say what is
 * happening and hand the file over when it arrives.
 */
export function DownloadRow({
  church,
  only,
  file,
}: {
  church: string;
  /** Which table, or nothing for the whole archive. */
  only?: string;
  /** The name the file is saved under. */
  file: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const run = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/export?church=${church}${only ? `&only=${only}` : ""}`,
      );
      if (!response.ok) throw new Error(String(response.status));

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("settings.export.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Working open={busy} label={t("settings.export.building")} />

      {error ? (
        <Banner tone="danger" title={t("settings.tab.export")}>{error}</Banner>
      ) : null}

      <IconButton
        label={t("settings.export.download")}
        variant="ghost"
        disabled={busy}
        onClick={() => void run()}
      >
        <Download />
      </IconButton>
    </>
  );
}
