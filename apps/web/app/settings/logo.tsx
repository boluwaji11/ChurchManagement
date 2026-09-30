"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { Banner, Button, Dialog, DialogTrigger, DialogContent } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { clearLogo } from "./actions";

/**
 * R1.1. The church logo.
 *
 * The quota from R1.16 is enforced on the way in and stays out of sight. A
 * church of this size will not come near two gibibytes with a logo and some
 * photographs, so a bar reading 282 kB of 2.1 GB only asks somebody to worry
 * about a number that will never move. The warning appears if it ever does.
 */
export function LogoAndStorage({
  church,
  churchName,
  logoUrl,
  fraction,
  warning,
  canEdit,
}: {
  church: string;
  churchName: string;
  logoUrl: string | null;
  fraction: number;
  warning: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [, startTransition] = React.useTransition();
  const [busy, setBusy] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);

  const percent = Math.round(fraction * 100);

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
    <div className="flex flex-col gap-4" aria-busy={busy}>
      {error ? <Banner tone="danger" title={t("church.logo")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center gap-4">
        {logoUrl ? (
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label={t("church.logo.view")}
                className="rounded-md border border-line bg-canvas p-1 hover:border-fg-subtle"
              >
                <img
                  src={logoUrl}
                  alt={t("church.logo.alt", { church: churchName })}
                  className="h-16 w-auto max-w-48 object-contain"
                />
              </button>
            </DialogTrigger>
            <DialogContent title={t("church.logo")} closeLabel={t("common.close")}>
              <img
                src={logoUrl}
                alt={t("church.logo.alt", { church: churchName })}
                className="max-h-[70vh] w-full rounded-md bg-canvas object-contain"
              />
            </DialogContent>
          </Dialog>
        ) : (
          <div className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed border-line-strong text-fg-subtle">
            <ImagePlus className="size-5" aria-hidden />
          </div>
        )}

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-3">
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
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              <ImagePlus /> {t("church.logo.upload")}
            </Button>
            {logoUrl ? (
              <Button type="button" variant="ghost" onClick={remove}>
                <X /> {t("church.logo.remove")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {warning ? (
        <Banner tone="warning" title={t("storage.warning", { percent: String(percent) })} />
      ) : null}
    </div>
  );
}
