"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Sheet, SheetContent } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { useDirty } from "@/components/form-actions";

export interface MemberPanelSection {
  id: string;
  label: string;
}

export function MemberPanel({
  title,
  sections,
  actions,
  footer,
  formId,
  children,
}: {
  title: string;
  sections: MemberPanelSection[];
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  formId?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [active, setActive] = React.useState(sections[0]?.id ?? "");
  const [confirmClose, setConfirmClose] = React.useState(false);
  const dirty = useDirty(formId ?? "");

  React.useEffect(() => {
    const selectSection = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (sections.some((section) => section.id === id)) setActive(id);
    };
    window.addEventListener("member-panel-section", selectSection);
    return () => window.removeEventListener("member-panel-section", selectSection);
  }, [sections]);

  const panelFooter = confirmClose ? (
    <div role="alert" className="flex w-full flex-wrap items-center justify-between gap-3">
      <span className="text-[13px] font-medium text-fg">{t("unsaved.title")}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => setConfirmClose(false)}>
          {t("unsaved.stay")}
        </Button>
        <Button variant="danger" onClick={() => router.back()}>
          {t("unsaved.discard")}
        </Button>
      </div>
    </div>
  ) : footer;
  const panelTitle = sections.find((section) => section.id === active)?.label ?? title;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (open) return;
        if (dirty) setConfirmClose(true);
        else router.back();
      }}
    >
      <SheetContent
        title={panelTitle}
        closeLabel={t("common.close")}
        actions={actions}
        footer={panelFooter}
        layout="centered"
        width="880px"
        className="gap-0"
        bodyClassName="min-h-0 gap-0 overflow-hidden p-0"
      >
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] sm:grid-cols-[200px_minmax(0,1fr)] sm:grid-rows-1">
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
                  "shrink-0 border-l-[3px] px-3 py-2 text-left text-[13px] font-medium sm:w-full",
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
            <div
              id="member-panel-content"
              className="scroll-quiet min-h-0 flex-1 overflow-y-auto p-5 sm:p-8"
            >
              <style>{`#member-panel-content [data-member-panel-section]:not([id="${active}"]) { display: none; }`}</style>
              {children}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
