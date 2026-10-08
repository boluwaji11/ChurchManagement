"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import {
  Banner, Button, IconButton, Dialog, DialogTrigger, DialogContent, DialogFooter, Working,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
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
  const [removing, startTransition] = React.useTransition();
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
      setDropping(false);
      setShowing(false);
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={busy || removing}>
      <Working
        open={busy || removing}
        label={removing ? t("church.logo.removing") : t("church.logo.uploading")}
      />

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
                  {/* What a replacement may be, read where somebody is about
                      to choose one rather than beside the logo on a screen
                      about the church. */}
                  <span className="mr-auto text-[12px] text-fg-subtle">
                    {imageLimit("logo")}
                  </span>
                  <IconButton
                    label={t("church.logo.remove")}
                    variant="ghost"
                    disabled={removing}
                    onClick={() => setDropping(true)}
                  >
                    <Trash2 />
                  </IconButton>
                  <IconButton
                    label={t("church.logo.upload")}
                    variant="ghost"
                    disabled={busy || removing}
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
             logo on it, pressing goes straight to the file picker, so what a
             picture may be is said here rather than in a panel that never
             opens. The caption sits under the letter in a column of its own,
             which leaves everything beside it where it was. */
          <span className="flex shrink-0 flex-col items-center gap-1.5">
            <button
              type="button"
              disabled={!canEdit || busy || removing}
              onClick={() => input.current?.click()}
              aria-label={t("church.logo.upload")}
              className="group relative grid size-14 place-items-center rounded-xl bg-primary font-display text-[24px] text-primary-fg enabled:cursor-pointer"
            >
              {churchName.trim().charAt(0).toUpperCase()}

              {/* R24.6. The letter is a square of colour and nothing about it
                  says it can be pressed, so it carries the pencil the rest of
                  the product uses for editing, and dims under the pointer the
                  way a photograph does. */}
              {canEdit ? (
                <>
                  <span className="absolute inset-0 grid place-items-center rounded-xl bg-fg/0 transition-colors group-hover:bg-fg/45 group-focus-visible:bg-fg/45">
                    <Pencil
                      className="size-5 text-surface opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      aria-hidden
                    />
                  </span>
                  <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full border border-line bg-surface text-fg shadow-sm">
                    <Pencil className="size-2.5" aria-hidden />
                  </span>
                </>
              ) : null}
            </button>
            {canEdit ? (
              <span className="text-center text-[11px] leading-tight text-fg-subtle">
                {imageLimit("logo")}
              </span>
            ) : null}
          </span>
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
          </>
        ) : null}
      </div>

      <Dialog open={dropping} onOpenChange={setDropping}>
        <DialogContent alert title={t("church.logo.remove")}>
          <p className="text-[length:var(--d-text-body)] text-fg-muted">
            {t("church.logo.removeBody")}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={removing}
              onClick={() => setDropping(false)}
            >
              {t("church.logo.keep")}
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={removing}
              onClick={remove}
            >
              <Trash2 /> {t("church.logo.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
