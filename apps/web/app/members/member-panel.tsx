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
  footer,
  formId,
  children,
}: {
  title: string;
  sections: MemberPanelSection[];
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
        title={title}
        closeLabel={t("common.close")}
        footer={panelFooter}
        width="960px"
        className="max-w-none gap-0 overflow-hidden"
        bodyClassName="min-h-0 gap-0 overflow-hidden p-0"
      >
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] sm:grid-cols-[190px_minmax(0,1fr)] sm:grid-rows-1">
          <nav
            aria-label={t("person.panelSections")}
            className="flex gap-1 overflow-x-auto border-b border-line bg-sunken p-2 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r sm:p-3"
          >
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                aria-pressed={active === section.id}
                onClick={() => setActive(section.id)}
                className={
                  "shrink-0 rounded-md px-3 py-2 text-left text-[13px] font-medium sm:w-full "
                  + (active === section.id
                    ? "bg-surface text-primary shadow-sm"
                    : "text-fg-muted hover:bg-surface hover:text-fg")
                }
              >
                {section.label}
              </button>
            ))}
          </nav>
          <div
            id="member-panel-content"
            className="min-h-0 overflow-y-auto p-4 sm:p-6"
          >
            <style>{`#member-panel-content [data-member-panel-section]:not([id="${active}"]) { display: none; }`}</style>
            {children}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
