"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Banner, Button, Combobox, Field,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { startFollowUp } from "../people/followup-actions";
import { findPeople } from "./actions";

/**
 * R5.4. Putting somebody on the board by hand.
 *
 * The triggers enter most people on their own, and a church still needs the
 * case the triggers do not cover: somebody who asked after a service. The
 * names offered leave out anybody already on this board.
 */
export function AddToBoard({
  church,
  pipelineId,
  stage,
}: {
  church: string;
  pipelineId: string;
  stage: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [person, setPerson] = React.useState("");
  const [people, setPeople] = React.useState<{ id: string; name: string }[]>([]);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  // The list is the first twenty names the moment the box opens, so a church
  // with one visitor to add never has to type.
  const look = React.useCallback(
    (search: string) => {
      void findPeople(pipelineId, search, church).then(setPeople);
    },
    [pipelineId, church],
  );

  React.useEffect(() => {
    if (open) look("");
  }, [open, look]);

  const add = () =>
    startTransition(async () => {
      const data = new FormData();
      data.set("church", church);
      data.set("pipelineId", pipelineId);
      data.set("personId", person);
      const result = await startFollowUp(data);
      setError(result.error);
      if (!result.error) {
        setPerson("");
        setOpen(false);
        router.refresh();
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPerson("");
          setError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button><Plus /> {t("board.add")}</Button>
      </DialogTrigger>

      <DialogContent title={t("board.addTo", { stage })} closeLabel={t("common.close")}>
        {error ? <Banner tone="danger" title={t("board.addFailed")}>{error}</Banner> : null}

        <Field label={t("team.person")} required>
          <Combobox
            options={people.map((one) => ({ value: one.id, label: one.name }))}
            value={person}
            onChange={setPerson}
            onQueryChange={look}
            placeholder={t("board.findPerson")}
            emptyLabel={t("board.noPerson")}
            clearLabel={t("date.clear")}
            aria-label={t("board.findPerson")}
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {t("action.cancel")}
          </Button>
          <Button type="button" disabled={!person || pending} onClick={add}>
            {t("action.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
