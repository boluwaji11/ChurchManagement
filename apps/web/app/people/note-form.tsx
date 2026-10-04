"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Lock } from "lucide-react";
import {
  Banner, Button, Checkbox, Dialog, DialogTrigger, DialogContent, DialogFooter,
  Field, Textarea,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { addNote } from "./note-actions";

/**
 * R2.7. A note about somebody.
 *
 * Two kinds, and the difference is who may open it again. A confidential note
 * is encrypted before it is stored, so the database holds a string it cannot
 * read, and only the roles that may read one are offered the choice.
 */
export function NoteForm({
  church,
  personId,
  canConfidential,
  trigger,
}: {
  church: string;
  personId: string;
  canConfidential: boolean;
  /** The control that opens it, where the screen wants its own. */
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [confidential, setConfidential] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="secondary"><Plus /> {t("notes.add")}</Button>}
      </DialogTrigger>
      <DialogContent title={t("notes.add")} closeLabel={t("common.close")}>
        <form
          noValidate
          action={(data) => {
            data.set("church", church);
            data.set("personId", personId);
            data.set("classification", confidential ? "confidential" : "general");
            startTransition(async () => {
              const result = await addNote(data);
              setError(result.error);
              if (!result.error) {
                setOpen(false);
                setConfidential(false);
                router.refresh();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          {error ? <Banner tone="danger" title={t("notes.failed")}>{error}</Banner> : null}

          <Field label={t("notes.body")} required>
            <Textarea name="body" rows={5} autoFocus />
          </Field>

          {canConfidential ? (
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox
                checked={confidential}
                onCheckedChange={(on) => setConfidential(on === true)}
              />
              <span className="flex items-center gap-1.5 text-[length:var(--d-text-body)] text-fg">
                <Lock className="size-4" aria-hidden />
                {t("notes.makeConfidential")}
              </span>
            </label>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button type="submit" loading={pending}>{t("action.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
