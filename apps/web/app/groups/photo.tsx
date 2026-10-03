"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { Banner, Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { clearGroupPhoto } from "./actions";

/**
 * R9.2, R1.16. The picture on a group.
 *
 * Through the one upload path, which checks the type, the size and the quota
 * before a byte is written. Replacing a picture forgets the old one, so a
 * leader who tries four photographs costs the church one.
 */
export function GroupPhoto({
  church,
  groupId,
  groupName,
  photoUrl,
  canEdit,
}: {
  church: string;
  groupId: string;
  groupName: string;
  photoUrl: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const [, startTransition] = React.useTransition();
  const input = React.useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(undefined);

    const data = new FormData();
    data.set("church", church);
    data.set("purpose", "group_photo");
    data.set("groupId", groupId);
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

  return (
    <div className="flex flex-col gap-3" aria-busy={busy}>
      {error ? <Banner tone="danger" title={t("group.photo")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center gap-4">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={t("group.photo.alt", { group: groupName })}
            className="h-24 w-36 rounded-[var(--d-radius-control)] object-cover"
          />
        ) : (
          <div className="flex h-24 w-36 items-center justify-center rounded-[var(--d-radius-control)] border border-dashed border-line-strong text-fg-subtle">
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
              <ImagePlus /> {photoUrl ? t("group.photo.replace") : t("group.photo.add")}
            </Button>

            {photoUrl ? (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  startTransition(async () => {
                    const result = await clearGroupPhoto(groupId, church);
                    setError(result.error);
                    if (!result.error) router.refresh();
                  })}
              >
                <Trash2 /> {t("group.photo.remove")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
