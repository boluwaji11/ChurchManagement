"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, ArchiveRestore } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, Field, IconButton, Input,
  Sheet, SheetContent,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { RichText } from "@/components/rich-text";
import { keepTemplate, putAwayTemplate } from "./actions";

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

/**
 * HRT-291, R16.4. The list, and the panel a template is written in.
 *
 * The same editor the composer uses, so what a church writes here is what it
 * will see there, marks and all.
 */
export function TemplateList({
  templates,
  putAway,
}: {
  templates: Template[];
  putAway: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState<Template | "new" | null>(null);
  const [asking, setAsking] = React.useState<Template | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const act = async (run: () => Promise<{ error?: string }>) => {
    setBusy(true);
    const answer = await run();
    setBusy(false);
    if (answer.error) {
      setError(answer.error);
      return;
    }
    setError(null);
    setOpen(null);
    setAsking(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {!putAway ? (
        <Button className="self-start" onClick={() => setOpen("new")}>
          <Plus aria-hidden /> {t("mailTemplate.add")}
        </Button>
      ) : null}

      {templates.length === 0 ? (
        <p className="m-0 text-fg-muted">
          {putAway ? t("mailTemplate.noneArchived") : t("mailTemplate.none")}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-[12px] border border-line p-0">
          {templates.map((one) => (
            <li key={one.id} className="group flex items-center gap-3 px-4 py-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium text-fg">{one.name}</span>
                <span className="truncate text-caption text-fg-subtle">{one.subject}</span>
              </span>

              <span className="flex shrink-0 items-center gap-0.5">
                {putAway ? (
                  <IconButton
                    label={t("mailTemplate.restore", { name: one.name })}
                    disabled={busy}
                    onClick={() => void act(() => putAwayTemplate(one.id, false))}
                  >
                    <ArchiveRestore />
                  </IconButton>
                ) : (
                  <>
                    <IconButton
                      label={t("mailTemplate.edit", { name: one.name })}
                      disabled={busy}
                      onClick={() => setOpen(one)}
                    >
                      <Pencil />
                    </IconButton>
                    <IconButton
                      label={t("mailTemplate.archive", { name: one.name })}
                      disabled={busy}
                      onClick={() => setAsking(one)}
                    >
                      <Archive />
                    </IconButton>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Writing
        open={open}
        busy={busy}
        onClose={() => setOpen(null)}
        onKeep={(data) => void act(() => keepTemplate(data))}
      />

      <Dialog open={asking !== null} onOpenChange={(next) => !next && setAsking(null)}>
        <DialogContent alert title={t("mailTemplate.archiveTitle")}>
          <p className="m-0 text-fg-muted">{t("mailTemplate.archiveBody")}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAsking(null)}>
              {t("action.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => asking && void act(() => putAwayTemplate(asking.id, true))}
            >
              {t("announce.archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** R24.6. A record is written in a panel from the right. */
function Writing({
  open,
  busy,
  onClose,
  onKeep,
}: {
  open: Template | "new" | null;
  busy: boolean;
  onClose: () => void;
  onKeep: (data: FormData) => void;
}) {
  const held = open === "new" ? null : open;
  const [name, setName] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [dirty, setDirty] = React.useState(false);

  /* Filled when the panel opens, and only then: re-rendering into the editor
     on every keystroke would put the caret back at the start. */
  React.useEffect(() => {
    if (open === null) return;
    setName(held?.name ?? "");
    setSubject(held?.subject ?? "");
    setBody(held?.body ?? "");
    setDirty(false);
  }, [open, held]);

  const full = name.trim() !== "" && subject.trim() !== "" && body.trim() !== "";

  const keep = () => {
    const data = new FormData();
    if (held) data.set("id", held.id);
    data.set("name", name);
    data.set("subject", subject);
    data.set("body", body);
    onKeep(data);
  };

  return (
    <Sheet open={open !== null} onOpenChange={(next) => !next && onClose()}>
      {open !== null ? (
        <SheetContent
          title={held ? t("mailTemplate.edit", { name: held.name }) : t("mailTemplate.add")}
          closeLabel={t("action.cancel")}
          width="560px"
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                {t("action.cancel")}
              </Button>
              <Button loading={busy} disabled={!full || !dirty} onClick={keep}>
                {t("action.save")}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label={t("mailTemplate.name")} required>
              <Input
                value={name}
                onChange={(e) => { setName(e.currentTarget.value); setDirty(true); }}
                placeholder={t("mailTemplate.namePlaceholder")}
                autoComplete="off"
              />
            </Field>

            <Field label={t("send.subject")} required>
              <Input
                value={subject}
                onChange={(e) => { setSubject(e.currentTarget.value); setDirty(true); }}
                placeholder={t("send.subjectPlaceholder")}
                autoComplete="off"
              />
            </Field>

            <Field label={t("send.body")} required>
              <RichText
                defaultValue={body}
                onChange={(next) => { setBody(next); setDirty(true); }}
                minHeight={260}
              />
            </Field>
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
