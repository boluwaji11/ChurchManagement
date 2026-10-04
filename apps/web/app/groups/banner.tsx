"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Upload, Trash2 } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, IconButton,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { clearGroupPhoto } from "./actions";

/**
 * R9.2, R1.16. The picture across the top of a group.
 *
 * A wide banner rather than a thumbnail, because the design puts it beside the
 * group's name at the size it will be seen at. Uploading goes through the one
 * upload path, which checks the type, the size and the quota before a byte is
 * written.
 */
export function GroupBanner({
  church,
  groupId,
  groupName,
  photoUrl,
  hue,
  canEdit,
}: {
  church: string;
  groupId: string;
  groupName: string;
  photoUrl: string | null;
  hue: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const [asking, setAsking] = React.useState(false);
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
    <div className="flex flex-col gap-2" aria-busy={busy}>
      {error ? <Banner tone="danger" title={groupName}>{error}</Banner> : null}

      <div className="relative">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={t("group.photo.alt", { group: groupName })}
            className="aspect-[16/9] w-full rounded-[14px] object-cover"
          />
        ) : (
          <div
            className="grid aspect-[16/9] w-full place-items-center rounded-[14px]"
            style={{
              background: `var(--hue-${hue}-tint)`,
              color: `var(--hue-${hue}-key)`,
              border: canEdit ? `2px dashed var(--hue-${hue}-500)` : "none",
            }}
          >
            {canEdit ? (
              <div className="flex flex-col items-center gap-1.5">
                <ImagePlus className="size-7" aria-hidden />
                <span className="font-semibold">{t("group.banner.add")}</span>
                <span className="text-[12px]">{t("group.banner.size")}</span>
              </div>
            ) : null}
          </div>
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
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="absolute right-3 bottom-3 h-[34px] min-h-0 gap-1.5 px-3 text-[13px] shadow-sm"
            >
              <Upload className="size-[15px]" aria-hidden />
              {photoUrl ? t("group.banner.replace") : t("group.banner.upload")}
            </Button>

            {photoUrl ? (
              <IconButton
                label={t("group.banner.remove")}
                variant="secondary"
                disabled={busy}
                onClick={() => setAsking(true)}
                className="absolute top-3 right-3 size-8 min-h-0 shadow-sm"
              >
                <Trash2 />
              </IconButton>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Taking a picture off is a removal, so it asks first. */}
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent alert title={t("group.banner.remove")} closeLabel={t("common.close")}>
          <p className="text-[length:var(--d-text-body)] text-fg">{t("group.photo.removeBody")}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAsking(false)}>{t("action.cancel")}</Button>
            <Button
              variant="danger"
              onClick={() => {
                setAsking(false);
                startTransition(async () => {
                  const result = await clearGroupPhoto(groupId, church);
                  setError(result.error);
                  if (!result.error) router.refresh();
                });
              }}
            >
              {t("group.banner.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
