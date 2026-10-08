"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Banner, Button, Field, Textarea,
  Sheet, SheetTrigger, SheetContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { addNote } from "./note-actions";
import { useFormError } from "@/lib/form-error";
import { useAnswered } from "@/components/form-actions";

/**
 * R2.7. A note about somebody.
 *
 * Two kinds, and the difference is who may open it again. A confidential note
 * is encrypted before it is stored, so the database holds a string it cannot
 * read, and only the roles that may read one are offered the choice.
 */
export function NoteForm({
  church,
  memberId,
  name,
  canConfidential,
  trigger,
}: {
  church: string;
  memberId: string;
  /** Whose note it is, for the sheet's title. */
  name: string;
  canConfidential: boolean;
  /** The control that opens it, where the screen wants its own. */
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [confidential, setConfidential] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const formId = React.useId();
  const full = useAnswered(formId, open);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? <Button variant="secondary"><Plus /> {t("notes.add")}</Button>}
      </SheetTrigger>
      <SheetContent
        title={t("notes.addFor", { name })}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button type="submit" form={formId} loading={pending} disabled={!full}>
              {t("notes.save")}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          noValidate
          action={(data) => {
            data.set("church", church);
            data.set("memberId", memberId);
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

          {/* R2.7. Who may open it again is the whole difference between the two
              kinds, so it is the first thing asked rather than a box underneath. */}
          {canConfidential ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("notes.whoCanRead")}</span>
              <Select
                value={confidential ? "confidential" : "general"}
                onValueChange={(v) => setConfidential(v === "confidential")}
              >
                <SelectTrigger aria-label={t("notes.whoCanRead")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t("notes.readStaff")}</SelectItem>
                  <SelectItem value="confidential">{t("notes.readPastoral")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <Field label={t("notes.body")} required>
            <Textarea name="body" rows={6} autoFocus />
          </Field>
        </form>
      </SheetContent>
    </Sheet>
  );
}
