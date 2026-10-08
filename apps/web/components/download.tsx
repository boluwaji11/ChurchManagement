"use client";

import * as React from "react";
import { Banner, Working, cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.6. A file the server has to build first.
 *
 * A plain link to an export is a press that does nothing for several seconds
 * and then drops a file in a folder. This asks for it in the page, holds the
 * Working panel over the screen while the server builds it, and hands the
 * file over when it lands. A refusal comes back as a sentence rather than as
 * a file of no bytes.
 */
export function Download({
  href,
  file,
  label,
  title,
  className,
  children,
}: {
  /** The address that builds it. */
  href: string;
  /** What the file is called once it is saved. */
  file: string;
  /** What the panel says while the server works. */
  label: string;
  /** What the banner is headed, where it fails. */
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const run = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const answer = await fetch(href);
      if (!answer.ok) {
        /* A refused export answers with a sentence, so it is read out. */
        const said = (await answer.json().catch(() => null)) as { error?: string } | null;
        throw new Error(said?.error ?? String(answer.status));
      }

      const blob = await answer.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file;
      link.click();
      URL.revokeObjectURL(url);
    } catch (why) {
      setError(why instanceof Error && why.message.length > 3 ? why.message : t("download.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Working open={busy} label={label} />

      {error ? (
        <Banner tone="danger" title={title}>{error}</Banner>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className={cn("cursor-pointer disabled:opacity-45", className)}
      >
        {children}
      </button>
    </>
  );
}
