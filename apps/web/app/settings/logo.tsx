"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { Banner, Button, Progress } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { clearLogo } from "./actions";

/**
 * R1.1 and R1.16. The logo, and what the church has used.
 *
 * The bar is here rather than on a page of its own because this is where files
 * arrive. A quota is a number somebody should meet at the moment they are about
 * to spend against it.
 */
export function LogoAndStorage({
  church,
  churchName,
  logoUrl,
  used,
  quota,
  fraction,
  warning,
  files,
  canEdit,
}: {
  church: string;
  churchName: string;
  logoUrl: string | null;
  used: string;
  quota: string;
  fraction: number;
  warning: boolean;
  files: number;
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
      {error ? <Banner tone="danger" title={t("storage.title")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center gap-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={t("church.logo.alt", { church: churchName })}
            className="h-16 w-auto max-w-48 rounded-md border border-line bg-canvas object-contain p-1"
          />
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

      <div className="flex flex-col gap-1.5">
        <Progress value={percent} tone={warning ? "warning" : "primary"} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-caption text-fg-muted">
            {t("storage.used", { used, quota })}
          </span>
          <span className="text-caption text-fg-muted">{plural("storage.files", files)}</span>
        </div>
      </div>

      {warning ? (
        <Banner tone="warning" title={t("storage.warning", { percent: String(percent) })} />
      ) : null}
    </div>
  );
}
