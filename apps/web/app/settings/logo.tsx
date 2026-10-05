"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  Banner, Button, IconButton, Dialog, DialogTrigger, DialogContent, DialogFooter, Working,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { imageLimit } from "@/components/image-limit";
import { clearLogo } from "./actions";

/**
 * R1.1. The church logo.
 *
 * It prints on a check-in label and sits at the top of the sidebar, so this is
 * the one place a church sets how it looks everywhere else. The storage quota
 * from R1.16 is enforced on the way in and stays out of sight: a church of this
 * size will never come near two gibibytes with a logo and some photographs, so
 * a number that never moves is a number nobody should be reading.
 */
export function ChurchLogo({
  church,
  churchName,
  logoUrl,
  canEdit,
}: {
  church: string;
  churchName: string;
  logoUrl: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [, startTransition] = React.useTransition();
  const [busy, setBusy] = React.useState(false);
  const [showing, setShowing] = React.useState(false);
  const [dropping, setDropping] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(undefined);
    const data = new FormData();
    data.set("church", church);
    data.set("purpose", "logo");
    data.set("file", file);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) setError(body.error ?? t("storage.error.failed"));
      else router.refresh();
    } catch {
      setError(t("storage.error.failed"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = () => {
    const data = new FormData();
    data.set("church", church);
    startTransition(async () => {
      const result = await clearLogo(data);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={busy}>
      <Working open={busy} label={t("church.logo.uploading")} />

      {error ? <Banner tone="danger" title={t("church.logo")}>{error}</Banner> : null}

      <div className="flex items-center gap-3">
        {logoUrl ? (
          <Dialog open={showing} onOpenChange={setShowing}>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label={t("church.logo.view")}
                className="size-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line bg-canvas p-1 hover:bg-sunken"
              >
                <img
                  src={logoUrl}
                  alt={t("church.logo.alt", { church: churchName })}
                  className="size-full object-contain"
                />
              </button>
            </DialogTrigger>
            {/* No heading over it. The picture is the whole content, and the
                word "Logo" above a logo says nothing. */}
            <DialogContent title={t("church.logo")} hideTitle closeLabel={t("common.close")}>
              <img
                src={logoUrl}
                alt={t("church.logo.alt", { church: churchName })}
                className="max-h-[70vh] w-full rounded-md bg-canvas object-contain"
              />
              {canEdit ? (
                <DialogFooter>
                  <IconButton
                    label={t("church.logo.remove")}
                    variant="ghost"
                    onClick={() => setDropping(true)}
                  >
                    <Trash2 />
                  </IconButton>
                  <IconButton
                    label={t("church.logo.upload")}
                    variant="ghost"
                    disabled={busy}
                    onClick={() => input.current?.click()}
                  >
                    <RefreshCw />
                  </IconButton>
                </DialogFooter>
              ) : null}
            </DialogContent>
          </Dialog>
        ) : (
          /* R1.1. The church's first letter until there is a logo, which is
             what the design draws and what a label prints meanwhile. With no
             logo on it, pressing goes straight to the file picker. */
          <button
            type="button"
            disabled={!canEdit || busy}
            onClick={() => input.current?.click()}
            aria-label={t("church.logo.upload")}
            className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary font-display text-[24px] text-primary-fg enabled:cursor-pointer enabled:hover:brightness-110"
          >
            {churchName.trim().charAt(0).toUpperCase()}
          </button>
        )}


        {canEdit ? (
          <>
            <input
              ref={input}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <span className="self-center text-[12px] text-fg-subtle">
              {imageLimit("logo")}
            </span>
          </>
        ) : null}
      </div>

      <Dialog open={dropping} onOpenChange={setDropping}>
        <DialogContent alert title={t("church.logo.remove")}>
          <p className="text-[length:var(--d-text-body)] text-fg-muted">
            {t("church.logo.removeBody")}
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDropping(false)}>
              {t("church.logo.keep")}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setDropping(false);
                setShowing(false);
                remove();
              }}
            >
              <Trash2 /> {t("church.logo.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
