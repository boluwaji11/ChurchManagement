"use client";

import * as React from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button, Dialog, DialogTrigger, DialogContent, DialogClose, Banner } from "@hearth/ui";
import { setArchived } from "./actions";

/**
 * Archiving is confirmed, never one click.
 *
 * It is reversible, and it is still the action that takes somebody out of every
 * list at once, including the list a volunteer will print on Sunday morning. The
 * dialog says what happens and what does not, because "are you sure?" tells
 * nobody anything.
 */
export function ArchiveButton({
  church,
  id,
  name,
  archived,
}: {
  church: string;
  id: string;
  name: string;
  archived: boolean;
}) {
  const [error, setError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);

  const submit = async (data: FormData) => {
    setPending(true);
    try {
      const result = await setArchived(data);
      if (result?.formError) setError(result.formError);
    } finally {
      setPending(false);
    }
  };

  if (archived) {
    return (
      <form action={submit} className="contents">
        <input type="hidden" name="church" value={church} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="archived" value="0" />
        <Button type="submit" variant="secondary" loading={pending}>
          <ArchiveRestore /> Restore
        </Button>
      </form>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <Archive /> Archive
        </Button>
      </DialogTrigger>
      <DialogContent
        title={`Archive ${name}?`}
        description="Reversible at any time, from this same page."
      >
        <p className="text-[length:var(--d-text-body)] text-fg-muted mb-5">
          They leave the directory, every list, and every report. Nothing is deleted. Their giving
          history, their attendance, and every note stay exactly as they are.
        </p>

        {error ? (
          <Banner tone="danger" title="Not archived" className="mb-4">
            {error}
          </Banner>
        ) : null}

        <form action={submit} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="church" value={church} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="archived" value="1" />
          <Button type="submit" variant="danger" loading={pending}>
            <Archive /> Archive {name}
          </Button>
          <DialogClose asChild>
            <Button variant="ghost" type="button">Keep them</Button>
          </DialogClose>
        </form>
      </DialogContent>
    </Dialog>
  );
}
