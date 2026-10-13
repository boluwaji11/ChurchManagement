"use client";

import * as React from "react";
import Link from "next/link";
import { t } from "@connectapp/i18n";

export interface RecordSectionLink {
  id: string;
  label: string;
  /**
   * Where the rail goes for this section, when the part is drawn on the server
   * and cannot be shown by hiding the others: a page of responses is read from
   * the database rather than held in the window.
   */
  href?: string;
}

/**
 * R2.1, R24.6. The rail and the one section it has open.
 *
 * Written once because the record is drawn twice: in the window over the list,
 * and on its own address when somebody follows a link or reloads. Those were
 * two different screens, and the page kept a three column layout and a row of
 * marks that the window had already left behind, so the same record looked
 * like two products depending on how it was reached.
 */
export function RecordBody({
  sections,
  aside = [],
  showing,
  children,
  className,
}: {
  sections: RecordSectionLink[];
  /**
   * R24.6. Parts the window can show that the rail does not name: a step
   * somebody is taken to and comes back from, such as adding members to a
   * group. The rail stays on the part they left, so the way back is where
   * they expect it.
   */
  aside?: string[];
  /** The section the server drew, where the rail navigates rather than hides. */
  showing?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [active, setActive] = React.useState(showing ?? sections[0]?.id ?? "");
  /* Where a step was opened from, so closing it goes back there. */
  const cameFrom = React.useRef<string | null>(null);
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  /* A section that goes away, because a church turned giving off or a custom
     field was deleted, must not leave the rail pointing at nothing. */
  React.useEffect(() => {
    setActive((was) =>
      sections.some((section) => section.id === was) || aside.includes(was)
        ? was
        : (sections[0]?.id ?? ""),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, aside.join(",")]);

  /*
   * R24.6. An address can name the section it wants.
   *
   * `/members/x/edit#contact` opens the edit screen on the contact fields, so
   * the mark beside a section on the record lands on the same section of the
   * form rather than at the top of it.
   */
  React.useEffect(() => {
    const wanted = window.location.hash.slice(1);
    if (wanted && sections.some((section) => section.id === wanted)) setActive(wanted);
    // Once, on arrival. After that the rail is whatever the reader pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Something elsewhere on the record can ask for a section, which is how a
     press inside one part opens another. */
  React.useEffect(() => {
    const selectSection = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      /* The ref is read before the state is asked to change, because an
         updater runs later: clearing it on the next line left the updater
         reading null and the step staying where it was. */
      if (id === "__back__") {
        const back = cameFrom.current;
        cameFrom.current = null;
        if (back) setActive(back);
        return;
      }
      if (aside.includes(id)) {
        cameFrom.current = active;
        setActive(id);
        return;
      }
      if (sections.some((section) => section.id === id)) {
        cameFrom.current = null;
        setActive(id);
      }
    };
    window.addEventListener("record-section", selectSection);
    return () => window.removeEventListener("record-section", selectSection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, aside.join(","), active]);

  return (
    <div
      className={[
        "grid min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)]",
        "sm:grid-cols-[200px_minmax(0,1fr)] sm:grid-rows-1",
        className ?? "",
      ].join(" ")}
    >
      <nav
        aria-label={t("person.panelSections")}
        className="scroll-quiet flex gap-1 overflow-x-auto border-b border-line bg-surface p-2 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r sm:p-3"
      >
        {sections.map((section) => {
          const on = (showing ?? active) === section.id;
          const look = [
            "shrink-0 cursor-pointer border-l-[3px] px-3 py-2 text-left text-[13px] font-medium sm:w-full",
            on
              ? "border-primary bg-primary-soft text-primary"
              : "border-transparent text-fg-muted hover:bg-sunken hover:text-fg",
          ].join(" ");

          return section.href ? (
            <Link
              key={section.id}
              href={section.href}
              aria-current={on ? "page" : undefined}
              className={look}
            >
              {section.label}
            </Link>
          ) : (
            <button
              key={section.id}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(section.id)}
              className={look}
            >
              {section.label}
            </button>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-col bg-surface">
        <div id={id} className="scroll-quiet min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          {/* A part can also be marked by name rather than by id, for a block
              that belongs to a section but sits outside it: a record can only
              carry one element with a given id. */}
          <style>{`#${id} [data-record-section]:not([id="${showing ?? active}"]),`
            + `#${id} [data-record-part]:not([data-record-part="${showing ?? active}"])`
            + ` { display: none; }`}</style>
          {children}
        </div>
      </div>
    </div>
  );
}
