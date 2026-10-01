"use client";

import * as React from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button, Dialog, DialogTrigger, DialogContent, DialogClose, DialogFooter, Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
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
      <form noValidate action={submit} className="contents">
        <input type="hidden" name="church" value={church} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="archived" value="0" />
        <Button type="submit" variant="secondary" loading={pending}>
          <ArchiveRestore /> {t("person.restore")}
        </Button>
      </form>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <Archive /> {t("person.archive")}
        </Button>
      </DialogTrigger>
      <DialogContent alert title={t("person.archive.confirmTitle", { name })}>
        <p className="text-[length:var(--d-text-body)] text-fg-muted mb-5">
          {t("person.archive.confirmBody")}
        </p>

        {error ? (
          <Banner tone="danger" title={t("person.archive.failed")} className="mb-4">{error}</Banner>
        ) : null}

        <form noValidate action={submit}>
          <input type="hidden" name="church" value={church} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="archived" value="1" />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button" data-dismiss>
                {t("person.archive.keep")}
              </Button>
            </DialogClose>
            <Button type="submit" variant="danger" loading={pending}>
              <Archive /> {t("person.archive.confirmAction", { name })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
