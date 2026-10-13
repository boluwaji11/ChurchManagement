"use client";

import * as React from "react";
import { t } from "@connectapp/i18n";

export interface RecordSectionLink {
  id: string;
  label: string;
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
  children,
  className,
}: {
  sections: RecordSectionLink[];
  children: React.ReactNode;
  className?: string;
}) {
  const [active, setActive] = React.useState(sections[0]?.id ?? "");
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  /* A section that goes away, because a church turned giving off or a custom
     field was deleted, must not leave the rail pointing at nothing. */
  React.useEffect(() => {
    setActive((was) =>
      sections.some((section) => section.id === was) ? was : (sections[0]?.id ?? ""),
    );
  }, [sections]);

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
      if (sections.some((section) => section.id === id)) setActive(id);
    };
    window.addEventListener("record-section", selectSection);
    return () => window.removeEventListener("record-section", selectSection);
  }, [sections]);

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
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-pressed={active === section.id}
            onClick={() => setActive(section.id)}
            className={[
              "shrink-0 cursor-pointer border-l-[3px] px-3 py-2 text-left text-[13px] font-medium sm:w-full",
              active === section.id
                ? "border-primary bg-primary-soft text-primary"
                : "border-transparent text-fg-muted hover:bg-sunken hover:text-fg",
            ].join(" ")}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-col bg-surface">
        <div id={id} className="scroll-quiet min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          <style>{`#${id} [data-record-section]:not([id="${active}"]) { display: none; }`}</style>
          {children}
        </div>
      </div>
    </div>
  );
}
