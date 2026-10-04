"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Banner, Button, Dialog, DialogTrigger, DialogContent, Working } from "@hearth/ui";
import { t } from "@hearth/i18n";
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
    <section
      className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5"
      aria-busy={busy}
    >
      <Working open={busy} label={t("church.logo.uploading")} />

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

        <span className="flex-[1_1_220px] font-semibold text-fg">{t("church.logo")}</span>

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
    </section>
  );
}
