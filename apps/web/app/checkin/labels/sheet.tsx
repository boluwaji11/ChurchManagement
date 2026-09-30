"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { Button, EmptyState } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { LabelPair } from "@hearth/db";

/**
 * R8.11. Two labels a child, printed together.
 *
 * The child's carries who they are, where they belong, which service, and the
 * code. The guardian's carries the child's name, the room, and the same code,
 * which is what somebody reads back at the door at 10:45.
 *
 * The code is the largest thing on both, because it is the thing being compared
 * across a counter by two people who have never met.
 */
export function LabelSheet({ labels }: { labels: LabelPair[] }) {
  // Printing on arrival, so the volunteer's next press is the printer dialog
  // rather than a button they have to find.
  React.useEffect(() => {
    if (labels.length > 0) window.print();
  }, [labels.length]);

  if (labels.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <EmptyState title={t("labels.none.title")} body={t("labels.none.body")} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center gap-3 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer /> {t("labels.print")}
        </Button>
        <Button variant="ghost" onClick={() => window.close()}>{t("common.close")}</Button>
      </div>

      <div className="flex flex-col gap-4 print:gap-0">
        {labels.map((label) => (
          <div key={label.personId} className="flex flex-wrap gap-4 print:block">
            <Label
              name={label.childName}
              code={label.code}
              room={label.roomName}
              lines={[label.serviceName, label.churchName]}
              allergy={label.allergy}
              kind={t("labels.child")}
            />
            <Label
              name={label.childName}
              code={label.code}
              room={label.roomName}
              lines={[t("labels.guardianLine")]}
              allergy={null}
              kind={t("labels.guardian")}
            />
          </div>
        ))}
      </div>
    </main>
  );
}

function Label({
  name,
  code,
  room,
  lines,
  allergy,
  kind,
}: {
  name: string;
  code: string;
  room: string | null;
  lines: string[];
  allergy: string | null;
  kind: string;
}) {
  return (
    <div
      className={
        "flex w-[62mm] flex-col justify-between gap-1 rounded-lg border border-line bg-surface p-3 " +
        "print:break-inside-avoid print:rounded-none print:border-black"
      }
      style={{ minHeight: "40mm" }}
    >
      <div className="text-caption uppercase tracking-wide text-fg-muted print:text-black">
        {kind}
      </div>

      <div className="text-title font-medium leading-tight text-fg print:text-black">{name}</div>

      {room ? (
        <div className="text-[length:var(--d-text-body)] text-fg print:text-black">{room}</div>
      ) : null}

      {allergy ? (
        <div className="rounded-md bg-danger px-2 py-1 text-caption font-medium text-white print:bg-white print:text-black print:outline print:outline-2">
          {allergy}
        </div>
      ) : null}

      <div className="font-mono text-display leading-none tracking-widest text-fg print:text-black">
        {code}
      </div>

      {lines.map((line) => (
        <div key={line} className="text-caption text-fg-muted print:text-black">
          {line}
        </div>
      ))}
    </div>
  );
}
