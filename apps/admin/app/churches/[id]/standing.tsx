"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, RotateCcw, Undo2 } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, DialogTrigger, Field, Textarea,
} from "@connectapp/ui";
import { approveChurch, unapproveChurch, archiveChurch, restoreChurch, type Done } from "@/app/actions";

type Act = (data: FormData) => Promise<Done>;

/**
 * R1.1, R21.x. The decisions, each behind a panel that asks for a note.
 *
 * The note is the point: a year later the question is never what happened but
 * why, and an operator who has to type one sentence writes the sentence.
 */
export function Standing({
  id,
  name,
  approved,
  archived,
}: {
  id: string;
  name: string;
  approved: boolean;
  archived: boolean;
}) {
  const [error, setError] = React.useState<string>();

  return (
    <aside className="flex h-fit flex-col gap-3 rounded-[16px] border border-line bg-surface p-6">
      <h2 className="font-display text-[20px] text-fg">Standing</h2>

      {error ? <Banner tone="danger" title="That did not work">{error}</Banner> : null}

      {archived ? (
        <Decision
          id={id}
          act={restoreChurch}
          onError={setError}
          title={`Put ${name} back into service?`}
          body="It counts again, and the people who could sign in to it can sign in to it."
          confirm="Put it back"
          trigger={
            <Button variant="secondary">
              <RotateCcw /> Put back into service
            </Button>
          }
        />
      ) : (
        <>
          {approved ? (
            <Decision
              id={id}
              act={unapproveChurch}
              onError={setError}
              title={`Put ${name} back behind the cap?`}
              body="It holds 25 members again, its invitations close and its sign-up address stops working."
              confirm="Put it back"
              tone="danger"
              trigger={
                <Button variant="secondary">
                  <Undo2 /> Unapprove
                </Button>
              }
            />
          ) : (
            <Decision
              id={id}
              act={approveChurch}
              onError={setError}
              title={`Approve ${name}?`}
              body="The cap comes off, invitations open and its own sign-up address starts working."
              confirm="Approve it"
              trigger={
                <Button>
                  <Check /> Approve this church
                </Button>
              }
            />
          )}

          <Decision
            id={id}
            act={archiveChurch}
            onError={setError}
            required
            title={`Take ${name} out of service?`}
            body="Every record it holds stays. Nobody can sign in to it, and it stops counting towards anything."
            confirm="Take it out of service"
            tone="danger"
            trigger={
              <Button variant="ghost" className="justify-start">
                <Archive /> Archive this church
              </Button>
            }
          />
        </>
      )}
    </aside>
  );
}

/** One decision: the panel, the note, and the press that writes the log. */
function Decision({
  id,
  act,
  title,
  body,
  confirm,
  trigger,
  tone = "default",
  required,
  onError,
}: {
  id: string;
  act: Act;
  title: string;
  body: string;
  confirm: string;
  trigger: React.ReactNode;
  tone?: "default" | "danger";
  /** Whether the note has to be written before the press is allowed. */
  required?: boolean;
  onError: (message?: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [saving, startTransition] = React.useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setNote("");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} closeLabel="Close">
        <div className="flex flex-col gap-4">
          <p className="text-[length:var(--d-text-body)] text-fg-muted">{body}</p>

          <Field label="Why" required={required}>
            <Textarea
              value={note}
              rows={2}
              onChange={(event) => setNote(event.target.value)}
              autoFocus
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={tone === "danger" ? "danger" : "primary"}
              disabled={saving || (required && note.trim() === "")}
              onClick={() => {
                const data = new FormData();
                data.set("id", id);
                data.set("note", note);
                startTransition(async () => {
                  const result = await act(data);
                  onError(result.error);
                  if (!result.error) {
                    setOpen(false);
                    setNote("");
                    router.refresh();
                  }
                });
              }}
            >
              {confirm}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
