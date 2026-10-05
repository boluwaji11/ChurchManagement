"use client";

import * as React from "react";
import { Paperclip, X } from "lucide-react";
import { Button, IconButton } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import {
  FILE_TYPES, UPLOAD_RULES, ONE_MIB, type FileKind, type FormFieldDef,
} from "@hearth/db/rules";

/** One file that is on its way up, or already there. */
interface Attached {
  key: string;
  name: string;
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
      taken.push({ key: result.key, name: result.name ?? file.name });
    }

    setHeld((was) => [...was, ...taken]);
    onChange([...value, ...taken.map((one) => one.key)]);
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  const drop = (key: string) => {
    setHeld((was) => was.filter((one) => one.key !== key));
    onChange(value.filter((one) => one !== key));
  };

  return (
    <div className="flex flex-col gap-2">
      {held.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {held.map((one) => (
            <li
              key={one.key}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5"
            >
              <Paperclip className="size-4 shrink-0 text-fg-subtle" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[length:var(--d-text-body)] text-fg">
                {one.name}
              </span>
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
    </div>
  );
}
