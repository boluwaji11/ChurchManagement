"use client";

import * as React from "react";
import { Paperclip, X } from "lucide-react";
import {
  Button, IconButton, Dialog, DialogContent,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import {
  FILE_TYPES, UPLOAD_RULES, ONE_MIB, type FileKind, type FormFieldDef,
} from "@hearth/db/rules";

/** One file that is on its way up, or already there. */
interface Attached {
  key: string;
  name: string;
  /**
   * R4.1. The file as the browser still holds it, for looking at.
   *
   * Made from the chosen file rather than fetched back, so a parent sees what
   * they attached without the bucket ever being readable from the open web.
   */
  preview: string;
  image: boolean;
}

/**
 * R4.1. Attaching files to an answer, for somebody with no account.
 *
 * Each file goes up as it is chosen rather than with the rest of the form, so
 * a parent on a phone sees it land and the submit press is not a minute of
 * silence. What rides on the answer is the keys; the bytes are already stored.
 */
export function FileAnswer({
  field,
  churchSlug,
  formSlug,
  value,
  onChange,
}: {
  field: FormFieldDef;
  churchSlug: string;
  formSlug: string;
  value: string[];
  onChange: (keys: string[]) => void;
}) {
  const [held, setHeld] = React.useState<Attached[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [looking, setLooking] = React.useState<Attached | null>(null);
  const [failed, setFailed] = React.useState<string>();
  const input = React.useRef<HTMLInputElement>(null);

  const most = field.maxFiles ?? 1;
  const accept = FILE_TYPES[(field.fileKinds ?? "any") as FileKind].join(",");
  const full = value.length >= most;

  const take = async (chosen: FileList | null) => {
    if (!chosen || chosen.length === 0) return;
    setFailed(undefined);
    setBusy(true);

    const taken: Attached[] = [];
    for (const file of Array.from(chosen).slice(0, most - value.length)) {
      const body = new FormData();
      body.set("church", churchSlug);
      body.set("form", formSlug);
      body.set("field", field.id);
      body.set("file", file);

      const answer = await fetch("/api/forms/upload", { method: "POST", body });
      const result = (await answer.json()) as { key?: string; name?: string; error?: string };
      if (!answer.ok || !result.key) {
        setFailed(result.error ?? t("storage.error.failed"));
        break;
      }
      taken.push({
        key: result.key,
        name: result.name ?? file.name,
        preview: URL.createObjectURL(file),
        image: file.type.startsWith("image/"),
      });
    }

    setHeld((was) => [...was, ...taken]);
    onChange([...value, ...taken.map((one) => one.key)]);
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  const drop = (key: string) => {
    setHeld((was) => {
      const going = was.find((one) => one.key === key);
      if (going) URL.revokeObjectURL(going.preview);
      return was.filter((one) => one.key !== key);
    });
    onChange(value.filter((one) => one !== key));
  };

  // Every object URL handed out is handed back when the question leaves the
  // screen, so a form filled in on a phone does not hold onto the pictures.
  React.useEffect(
    () => () => { for (const one of held) URL.revokeObjectURL(one.preview); },
    [held],
  );

  return (
    <div className="flex flex-col gap-2">
      {held.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {held.map((one) => (
            <li
              key={one.key}
              className="flex items-center gap-2.5 rounded-lg border border-line bg-surface p-1.5 pr-3"
            >
              {one.image ? (
                <button
                  type="button"
                  onClick={() => setLooking(one)}
                  aria-label={one.name}
                  className="shrink-0 cursor-pointer"
                >
                  <img src={one.preview} alt="" className="size-10 rounded-md object-cover" />
                </button>
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-sunken">
                  <Paperclip className="size-4 text-fg-subtle" aria-hidden />
                </span>
              )}

              {/* Opened on the page rather than in a tab of its own. What the
                  browser hands back for a file it is holding is an address
                  nobody should be shown. */}
              <button
                type="button"
                onClick={() => setLooking(one)}
                className="min-w-0 flex-1 cursor-pointer truncate text-left text-[length:var(--d-text-body)] text-fg underline-offset-4 hover:underline"
              >
                {one.name}
              </button>
              <IconButton
                label={t("form.files.remove", { name: one.name })}
                onClick={() => drop(one.key)}
                className="size-7 min-h-0 [&_svg]:size-3.5"
              >
                <X />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : null}

      {/* The browser's own file picker is the one control an operating system
          is allowed to draw, because there is no other way to reach the disk.
          The button that opens it is ours. */}
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={most > 1}
        onChange={(e) => void take(e.target.files)}
        className="hidden"
      />

      <Button
        type="button"
        variant="secondary"
        disabled={busy || full}
        onClick={() => input.current?.click()}
        className="self-start"
      >
        {busy ? t("form.files.uploading") : t("form.files.choose")}
      </Button>

      <span className="text-caption text-fg-subtle">
        {plural("form.files.limit", most, {
          count: most,
          size: `${Math.round(UPLOAD_RULES.form_answer.maxBytes / ONE_MIB)} MB`,
        })}
      </span>

      {failed ? <span className="text-caption text-danger-text">{failed}</span> : null}

      <Dialog open={looking !== null} onOpenChange={(on) => { if (!on) setLooking(null); }}>
        <DialogContent title={looking?.name ?? ""} closeLabel={t("common.close")}>
          {looking?.image ? (
            <img
              src={looking.preview}
              alt=""
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          ) : looking ? (
            <iframe
              src={looking.preview}
              title={looking.name}
              className="h-[70vh] w-full rounded-lg border border-line"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
