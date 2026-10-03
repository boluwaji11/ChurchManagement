"use client";

import * as React from "react";
import { t } from "@hearth/i18n";
import type { MessageTemplate, MergeValues, Send as SendRow } from "@hearth/db";
import type { AudienceKind } from "@hearth/db/rules";
import { AudiencePicker, type PickerOptions } from "./audience-picker";
import { Composer } from "./composer";
import { Sends } from "./sends";

/**
 * R16.4 to R16.6. Writing it, choosing who gets it, and sending it.
 *
 * One client component holds the three, because they are one task: the subject
 * being written is the subject being sent, and a screen where those are two
 * separate things is a screen where somebody sends the wrong one.
 */
export function MessagesScreen({
  church,
  library,
  sample,
  options,
  sends,
}: {
  church: string;
  library: MessageTemplate[];
  sample: MergeValues;
  options: PickerOptions;
  sends: SendRow[];
}) {
  const [draft, setDraft] = React.useState({ subject: "", body: "" });
  const [audience, setAudience] = React.useState<{
    kind: AudienceKind;
    id: string;
    name: string;
  }>({ kind: "everybody", id: "", name: t("audience.kind.everybody") });

  const ready =
    draft.subject.trim().length > 0
    && draft.body.trim().length > 0
    && (audience.kind === "everybody" || audience.id !== "");

  return (
    <div className="flex flex-col gap-6">
      <AudiencePicker
        church={church}
        options={options}
        kind={audience.kind}
        id={audience.id}
        onChange={setAudience}
      />

      <Composer
        church={church}
        library={library}
        sample={sample}
        subject={draft.subject}
        body={draft.body}
        onChange={setDraft}
      />

      <Sends
        church={church}
        rows={sends}
        canSend={ready}
        draft={{
          subject: draft.subject,
          body: draft.body,
          audience: {
            kind: audience.kind,
            id: audience.kind === "everybody" ? null : audience.id,
          },
          audienceName: audience.name || t("audience.kind.everybody"),
        }}
      />
    </div>
  );
}
