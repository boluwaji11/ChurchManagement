"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Banner, Button, Combobox, Field,
  Sheet, SheetTrigger, SheetContent,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Searching } from "@/components/searching";
import { useFormError } from "@/lib/form-error";
import { addToStage, findPeople } from "./actions";

/**
 * R5.4. Starting a follow-up, from the top of the board.
 *
 * The press at the head of a column says "they are already at this stage".
 * This one says "begin", which is the errand somebody opens the board for and
 * the one the screen is named after, so it enters them at the first step with
 * every step after it written out and dated.
 */
export function StartFollowUp({
  church,
  pipelineId,
}: {
  church: string;
  pipelineId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [who, setWho] = React.useState("");
  const [people, setPeople] = React.useState<{ id: string; name: string }[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [pending, startTransition] = React.useTransition();
  // An answer that arrives after a newer one was asked for is dropped.
  const ticket = React.useRef(0);

  /* Nothing is fetched until a name is being typed: a church of five hundred
     reading the first fifty surnames in the alphabet learns nothing. */
  const look = (search: string) => {
    if (!search.trim()) {
      ticket.current += 1;
      setSearching(false);
      setPeople([]);
      return;
    }
    const mine = ++ticket.current;
    setSearching(true);
    void findPeople(pipelineId, search, church).then((found) => {
      if (mine !== ticket.current) return;
      setSearching(false);
      setPeople(found);
    });
  };

  /* Blank on every close, including Cancel and Escape: one panel serves the
     whole board, and it must not reopen holding the last person. */
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setWho("");
      setPeople([]);
    }
  };

  const submit = () => {
    if (!who) return;
    startTransition(async () => {
      const result = await addToStage(pipelineId, who, 0, church);
      setError(result.error);
      if (!result.error) {
        close(false);
        router.refresh();
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetTrigger asChild>
        <Button>
          <Plus /> {t("board.start")}
        </Button>
      </SheetTrigger>

      <SheetContent
        title={t("board.start")}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => close(false)}>
              {t("action.cancel")}
            </Button>
            <Button onClick={submit} disabled={pending || !who} loading={pending}>
              {t("board.start")}
            </Button>
          </>
        }
      >
        {error ? <Banner tone="danger" title={t("board.failed")}>{error}</Banner> : null}

        <Field label={t("reports.name")} required>
          <Searching on={searching}>
            <Combobox
              options={people.map((one) => ({ value: one.id, label: one.name }))}
              value={who}
              onChange={setWho}
              onQueryChange={look}
              placeholder={t("board.findPerson")}
              emptyLabel={t("incident.noPerson")}
              clearLabel={t("date.clear")}
            />
          </Searching>
        </Field>
      </SheetContent>
    </Sheet>
  );
}
