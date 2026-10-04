"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
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
  used,
  quota,
  warning,
  canEdit,
}: {
  church: string;
  churchName: string;
  logoUrl: string | null;
  fraction: number;
  /** Already written, "1.2 GB". */
  used: string;
  quota: string;
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
    <section
      className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5"
      aria-busy={busy}
    >
      {error ? <Banner tone="danger" title={t("church.logo")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center gap-4">
        {logoUrl ? (
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label={t("church.logo.view")}
                className="size-16 shrink-0 cursor-pointer overflow-hidden rounded-[14px] border border-line bg-canvas p-1 hover:border-line-strong"
              >
                <img
                  src={logoUrl}
                  alt={t("church.logo.alt", { church: churchName })}
                  className="size-full object-contain"
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
          /* R1.1. The church's first letter until there is a logo, which is
             what the design draws and what a label prints meanwhile. */
          <span className="grid size-16 shrink-0 place-items-center rounded-[14px] bg-primary font-display text-[26px] text-primary-fg">
            {churchName.trim().charAt(0).toUpperCase()}
          </span>
        )}

        <div className="flex flex-[1_1_220px] flex-col gap-2">
          <span className="font-semibold text-fg">{t("church.logo")}</span>

          <span className="h-1.5 overflow-hidden rounded-full bg-line">
            <span
              className={warning ? "block h-full bg-danger" : "block h-full bg-primary"}
              style={{ width: `${Math.max(percent, 1)}%` }}
            />
          </span>

          <span className="text-[12px] text-fg-subtle">
            {t("storage.used", { used, quota })}
          </span>
        </div>

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
            <div className="flex flex-wrap items-center gap-2">
              {logoUrl ? (
                <Button type="button" variant="ghost" onClick={remove}>
                  <X /> {t("church.logo.remove")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => input.current?.click()}
              >
                {t("church.logo.upload")}
              </Button>
            </div>
          </>
        ) : null}
      </div>

      {warning ? (
        <Banner tone="warning" title={t("storage.warning", { percent: String(percent) })} />
      ) : null}
    </section>
  );
}
