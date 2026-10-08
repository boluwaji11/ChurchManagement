"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Trash2, Upload } from "lucide-react";
import { Button, IconButton, Spinner, Working, ALL_HUES } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { imageLimit } from "@/components/image-limit";
import { clearFormCover, recolourForm } from "../actions";

/**
 * R4.1, R24.4. How a form looks before anybody reads a word of it.
 *
 * The same shape the group designer uses: a wide picture across the top, and a
 * flat band in the form's own colour where there is none. A church linking a
 * form off its website is handing somebody a page, and a page of grey boxes
 * says the church did not think it mattered.
 */
export function FormCover({
  church,
  formId,
  hue,
  coverUrl,
}: {
  church: string;
  formId: string;
  hue: string;
  coverUrl: string | null;
}) {
  const router = useRouter();
  const file = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [local, setLocal] = React.useState<string | null>(null);
  /*
   * R24.6. Taking the picture off and changing the colour both write and then
   * redraw the page, so the control that was pressed holds the press: it goes
   * dead and carries a spinner until the new page lands.
   */
  const [working, startWorking] = React.useTransition();
  const [awaiting, setAwaiting] = React.useState<string | null>(null);
  const busy = uploading || working;

  React.useEffect(() => {
    if (!working) setAwaiting(null);
  }, [working]);

  const shown = local ?? coverUrl;

  const upload = async (picked: File) => {
    setUploading(true);
    // Shown straight away from the file in hand, so the band does not sit empty
    // while the bytes go up.
    setLocal(URL.createObjectURL(picked));

    const body = new FormData();
    body.set("church", church);
    body.set("purpose", "form_cover");
    body.set("formId", formId);
    body.set("file", picked);
    await fetch("/api/upload", { method: "POST", body });

    setUploading(false);
    startWorking(() => router.refresh());
  };

  /** A write on one of the controls, held until the page has redrawn. */
  const run = (which: string, write: () => Promise<unknown>) => {
    setAwaiting(which);
    startWorking(async () => {
      await write();
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={busy}>
      <Working open={uploading} label={t("image.uploading")} />

      <div className="relative">
        {shown ? (
          <img
            src={shown}
            alt=""
            className="aspect-[6/1] w-full rounded-[14px] object-cover"
          />
        ) : (
          <div
            /* R24.6. A sixth as tall as it is wide is 65 points on a phone,
               and the button in the corner lands on top of the words. */
            className="grid aspect-[3/1] w-full place-items-center rounded-[14px] sm:aspect-[6/1]"
            style={{
              background: `var(--hue-${hue}-tint)`,
              color: `var(--hue-${hue}-key)`,
              border: `2px dashed var(--hue-${hue}-500)`,
            }}
          >
            <span className="flex flex-col items-center gap-1">
              <span className="flex items-center gap-2 font-semibold">
                <ImagePlus className="size-5" aria-hidden />
                {t("form.cover")}
              </span>
              <span className="hidden text-[12px] sm:block">{imageLimit("form_cover")}</span>
            </span>
          </div>
        )}

        <input
          ref={file}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) void upload(picked);
          }}
        />

        <Button
          type="button"
          variant="secondary"
          loading={uploading}
          disabled={busy}
          onClick={() => file.current?.click()}
          className="absolute right-3 bottom-3 h-[34px] min-h-0 gap-1.5 px-3 text-[13px] shadow-sm"
        >
          <Upload className="size-[15px]" aria-hidden />
          {shown ? t("form.coverChange") : t("form.cover")}
        </Button>

        {shown ? (
          <IconButton
            label={t("form.coverRemove")}
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setLocal(null);
              if (file.current) file.current.value = "";
              run("cover", () => clearFormCover(formId, church));
            }}
            className="absolute top-3 right-3 size-8 min-h-0 shadow-sm"
          >
            {awaiting === "cover" ? <Spinner /> : <Trash2 />}
          </IconButton>
        ) : null}
      </div>

      {/* The colour the form wears, from the twelve the rest of the product
          assigns to things. It paints the band, the heading rule and the tile
          on the Forms list. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-medium text-fg-subtle">{t("form.colour")}</span>
        {ALL_HUES.map((one) => (
          <button
            key={one}
            type="button"
            aria-label={one}
            aria-pressed={hue === one}
            disabled={busy}
            onClick={() => run(one, () => recolourForm(formId, one, church))}
            className={
              "grid size-9 cursor-pointer place-items-center rounded-full border-2 transition-colors sm:size-6 "
              + (hue === one ? "border-fg" : "border-transparent hover:border-line-strong")
            }
            style={{ background: `var(--hue-${one}-500)` }}
          >
            {/* The ring says which one, and the check says it again for anybody
                who cannot pick the ring out of twelve coloured circles. */}
            {awaiting === one ? (
              <Spinner className="text-white [&>span]:size-3.5" />
            ) : hue === one ? (
              <Check className="size-5 text-white sm:size-3.5" strokeWidth={3} aria-hidden />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
