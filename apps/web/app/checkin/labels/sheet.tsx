"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { Button, EmptyState, STOCK, printCss, stockOf, type Stock } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { LabelPair } from "@hearth/db";

/**
 * R8.11, R8.25, R8.26. Two labels a child, printed together.
 *
 * The child's carries who they are, where they belong, which service, and the
 * code. The guardian's carries the child's name, the room, and the same code,
 * which is what somebody reads back at the door at 10:45.
 *
 * The code is the largest thing on both, because it is the thing being compared
 * across a counter by two people who have never met.
 *
 * The shape comes from the station's label stock. A Brother roll and a Dymo
 * roll are different sizes and the Dymo is short enough that the code has to
 * move, so the two layouts are written rather than scaled.
 */
export function LabelSheet({
  labels,
  printer,
}: {
  labels: LabelPair[];
  /** The station's stock. Anything unrecognised is a sheet of paper. */
  printer?: string;
}) {
  const stock = stockOf(printer);

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
      {/* The page size is the whole trick, and it cannot be written as a class. */}
      <style>{printCss(stock)}</style>

      <div className="mb-6 flex items-center gap-3 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer /> {t("labels.print")}
        </Button>
        <Button variant="ghost" onClick={() => window.close()}>{t("common.close")}</Button>
      </div>

      <div className="flex flex-wrap gap-4 print:gap-0">
        {labels.map((label) =>
          label.code === null ? (
            /* R8.5. A name badge: who this is, and nothing that claims a child. */
            <Label
              key={label.personId}
              stock={stock}
              name={label.childName}
              code={null}
              room={null}
              lines={[label.serviceName, label.churchName]}
              allergy={null}
              kind={t("labels.badge")}
            />
          ) : (
            <React.Fragment key={label.personId}>
              <Label
                stock={stock}
                name={label.childName}
                code={label.code}
                room={label.roomName}
                lines={[label.serviceName, label.churchName]}
                allergy={label.allergy}
                kind={t("labels.child")}
              />
              <Label
                stock={stock}
                name={label.childName}
                code={label.code}
                room={label.roomName}
                lines={[t("labels.guardianLine")]}
                allergy={null}
                kind={t("labels.guardian")}
              />
            </React.Fragment>
          ),
        )}
      </div>
    </main>
  );
}

function Label({
  stock,
  name,
  code,
  room,
  lines,
  allergy,
  kind,
}: {
  stock: Stock;
  name: string;
  code: string | null;
  room: string | null;
  lines: string[];
  allergy: string | null;
  kind: string;
}) {
  const shape = STOCK[stock];
  const box =
    "hearth-label flex flex-col justify-between gap-1 rounded-lg border border-line bg-surface p-3 " +
    "text-fg print:border-black print:bg-white print:text-black";

  // A Dymo address label is 28mm tall, which is one line of name and one of
  // room. The code goes beside them rather than under them, and it stays the
  // largest thing on the label.
  if (stock === "dymo") {
    return (
      <div
        className={`${box} flex-row items-center justify-between`}
        style={{ width: `${shape.width}mm`, minHeight: `${shape.height}mm` }}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[length:var(--d-text-body)] font-medium leading-tight">
            {name}
          </span>
          {room ? <span className="truncate text-caption">{room}</span> : null}
          {allergy ? (
            <span className="truncate text-caption font-semibold uppercase">{allergy}</span>
          ) : null}
          <span className="truncate text-caption opacity-70">{kind}</span>
        </div>

        {code ? (
          <span className="shrink-0 font-mono text-title leading-none tracking-widest">{code}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={box}
      style={{ width: `${shape.width}mm`, minHeight: `${shape.height}mm` }}
    >
      <div className="text-caption uppercase tracking-wide text-fg-muted print:text-black">
        {kind}
      </div>

      <div className={code ? "text-title font-medium leading-tight" : "text-display font-medium leading-tight"}>
        {name}
      </div>

      {room ? <div className="text-[length:var(--d-text-body)]">{room}</div> : null}

      {allergy ? (
        <div className="rounded-md bg-danger px-2 py-1 text-caption font-medium text-white print:bg-white print:text-black print:outline print:outline-2">
          {allergy}
        </div>
      ) : null}

      {code ? (
        <div className="font-mono text-display leading-none tracking-widest">{code}</div>
      ) : null}

      {lines.map((line) => (
        <div key={line} className="text-caption text-fg-muted print:text-black">
          {line}
        </div>
      ))}
    </div>
  );
}
