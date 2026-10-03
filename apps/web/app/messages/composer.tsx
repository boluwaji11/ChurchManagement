"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FileText } from "lucide-react";
import {
  Banner, Button, Card, CardTitle, EmptyState, Field, IconButton, Input, Separator, Textarea,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
// The pure subpath, so the composer's live preview does not drag the database
// layer and node:crypto into the browser bundle.
import {
  MERGE_FIELDS, mergeInto, unknownFields,
  type MessageTemplate, type MergeValues,
} from "@hearth/db/rules";
import { keepTemplate, dropTemplate } from "./actions";

/**
 * R16.4. Writing a message, and keeping the ones worth sending again.
 *
 * The preview is the point. A merge field is a thing a volunteer gets wrong
 * once and finds out about four hundred times, so the message is shown as one
 * person will read it while it is being written.
 */
export function Composer({
  church,
  library,
  sample,
  subject,
  body,
  onChange,
}: {
  church: string;
  library: MessageTemplate[];
  /** A real person from this church, so the preview reads like a real message. */
  sample: MergeValues;
  subject: string;
  body: string;
  onChange: (next: { subject: string; body: string }) => void;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const [editing, setEditing] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  const setSubject = (next: string) => onChange({ subject: next, body });
  const setBody = (next: string) => onChange({ subject, body: next });

  const stray = unknownFields(`${subject}\n${body}`);

  const load = (template: MessageTemplate) => {
    setEditing(template.id);
    setName(template.name);
    setSubject(template.subject);
    setBody(template.body);
    setError(undefined);
  };

  const blank = () => {
    setEditing(null);
    setName("");
    setSubject("");
    setBody("");
    setError(undefined);
  };

  /** Drops a merge field where the cursor is, which is where somebody wants it. */
  const insert = (field: string) => {
    const area = bodyRef.current;
    const token = `{{${field}}}`;
    if (!area) {
      setBody(`${body}${token}`);
      return;
    }
    const from = area.selectionStart ?? body.length;
    const to = area.selectionEnd ?? from;
    setBody(`${body.slice(0, from)}${token}${body.slice(to)}`);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(from + token.length, from + token.length);
    });
  };

  const save = () => {
    startTransition(async () => {
      const result = await keepTemplate({ name, subject, body }, editing, church);
      setError(result.error);
      if (!result.error) {
        setEditing(result.id ?? null);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("compose.failed")}>{error}</Banner> : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{editing ? name : t("compose.new")}</CardTitle>
          {editing ? (
            <Button variant="ghost" onClick={blank}>
              <Plus /> {t("compose.new")}
            </Button>
          ) : null}
        </div>
        <Separator className="my-4" />

        <div className="flex flex-col gap-4">
          <Field label={t("compose.name")} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </Field>

          <Field label={t("compose.subject")} required>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              autoComplete="off"
            />
          </Field>

          <Field label={t("compose.body")} required>
            <Textarea
              ref={bodyRef}
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-label text-fg">{t("compose.fields")}</span>
            <div className="flex flex-wrap gap-2">
              {MERGE_FIELDS.map((field) => (
                <Button
                  key={field}
                  type="button"
                  variant="secondary"
                  onClick={() => insert(field)}
                >
                  {t(`compose.field.${field}` as never)}
                </Button>
              ))}
            </div>
          </div>

          {stray.length > 0 ? (
            <Banner
              tone="warning"
              title={t("compose.unknown", { fields: stray.map((f) => `{{${f}}}`).join(", ") })}
            />
          ) : null}

          <div>
            <Button type="button" disabled={pending} onClick={save}>
              {editing ? t("compose.update") : t("compose.save")}
            </Button>
          </div>
        </div>
      </Card>

      {/* R16.4. As one person will read it, while it is being written. */}
      <Card>
        <CardTitle>{t("compose.preview")}</CardTitle>
        <Separator className="my-4" />
        <div className="flex flex-col gap-2">
          <span className="text-caption text-fg-muted">
            {t("compose.previewFor", { who: sample.full_name ?? "" })}
          </span>
          <span className="font-display text-heading text-fg">
            {mergeInto(subject, sample)}
          </span>
          <p className="whitespace-pre-wrap text-[length:var(--d-text-body)] text-fg">
            {mergeInto(body, sample)}
          </p>
        </div>
      </Card>

      <Card>
        <CardTitle>{t("compose.library")}</CardTitle>
        <Separator className="my-4" />

        {library.length === 0 ? (
          <EmptyState title={t("compose.empty")} />
        ) : (
          <ul className="flex flex-col">
            {library.map((template, i) => (
              <li key={template.id}>
                {i > 0 ? <Separator className="my-2" /> : null}
                <div className="flex flex-wrap items-center gap-3">
                  <FileText className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[length:var(--d-text-body)] text-fg">
                      {template.name}
                    </span>
                    <span className="truncate text-caption text-fg-muted">
                      {template.subject}
                    </span>
                  </span>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => load(template)}
                  >
                    {t("compose.open")}
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <IconButton label={t("compose.remove")} disabled={pending}>
                        <Trash2 />
                      </IconButton>
                    </DialogTrigger>
                    <DialogContent
                      title={t("compose.removeTitle", { name: template.name })}
                      closeLabel={t("common.close")}
                    >
                      <p className="text-[length:var(--d-text-body)] text-fg">
                        {t("compose.removeBody")}
                      </p>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await dropTemplate(template.id, church);
                              setError(result.error);
                              if (!result.error) {
                                if (editing === template.id) blank();
                                router.refresh();
                              }
                            })}
                        >
                          {t("compose.remove")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
