"use client";

/**
 * HRT-378, R22.2. The website, inside the editor, editable where it stands.
 *
 * The centre of the screen is the page itself: the same header, the same
 * sections, the same footer, the same type and the same spacing the
 * congregation will read. The editor adds a layer of chrome over it and nothing
 * else, so what a church sees while it builds is what it gets.
 *
 * Three things happen here. A press selects whatever was pressed, down to the
 * field. A second press on a word opens it for typing, in place. A section can
 * be dragged into a different position, with a bar showing where it will land.
 * Everything else belongs to the inspector on the right.
 */

import * as React from "react";
import {
  ArrowDown, ArrowUp, Bold, Copy, Eye, EyeOff, GripVertical, Italic,
  LayoutTemplate, Link2, Plus, Trash2,
} from "lucide-react";
import { t } from "@connectapp/i18n";
import type { SiteDoc, SitePage, SiteSection } from "@connectapp/db/rules";
import { Tooltip } from "@connectapp/ui";
import { SiteFrame, SectionView } from "@/components/church-site/page-view";
import { SiteFooterView, SiteHeaderView } from "@/components/church-site/header";
import type { SiteCtx } from "@/components/church-site/kit";
import { kindOf } from "@/components/church-site/registry";
import { FOOTER, HEADER, type Selection } from "./store";
import { lineFrom, pasteAsText, runsFrom } from "./rich";

export interface CanvasHandlers {
  onSelect: (selection: Selection | null) => void;
  onField: (sectionId: string, path: string, value: unknown) => void;
  onMove: (from: number, to: number) => void;
  onDuplicate: (sectionId: string) => void;
  onRemove: (sectionId: string) => void;
  onHide: (sectionId: string) => void;
  onAddAt: (index: number) => void;
  onLayout: (sectionId: string) => void;
}

const CHROME_BUTTON =
  "inline-flex size-8 items-center justify-center rounded-md border border-line"
  + " bg-surface text-fg-muted shadow-sm transition-colors hover:bg-raised"
  + " hover:text-fg focus-visible:outline focus-visible:outline-2"
  + " focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40";

/** A control on the chrome, which is the product's own UI rather than the site's. */
function Chrome({
  label,
  onPress,
  children,
  disabled,
  tone,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  tone?: "danger";
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onPress();
        }}
        onMouseDown={(event) => event.stopPropagation()}
        className={`${CHROME_BUTTON} ${tone === "danger" ? "hover:text-danger" : ""}`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/* ------------------------------------------------------- typing in the page --- */

interface Typing {
  sectionId: string;
  path: string;
  kind: "line" | "rich";
}

/**
 * Opens one field for typing, and closes it again.
 *
 * The element is the one the section already drew, so the words stay in the
 * place and the face they will be read in. React is told nothing until the
 * field is closed: the browser owns the caret while somebody is typing, and a
 * re-render underneath it would throw the caret back to the start of the line.
 */
function useTyping(
  frame: React.RefObject<HTMLDivElement | null>,
  typing: Typing | null,
  commit: (value: unknown) => void,
  close: () => void,
) {
  const held = React.useRef<HTMLElement | null>(null);
  /* Held in refs so the effect depends on the field being typed in and nothing
     else: rebuilding the listeners under a live caret loses the caret. */
  const onCommit = React.useRef(commit);
  onCommit.current = commit;
  const onClose = React.useRef(close);
  onClose.current = close;

  const where = typing
    ? `${typing.sectionId}\u0000${typing.path}\u0000${typing.kind}`
    : null;

  React.useEffect(() => {
    if (!typing || !frame.current) return undefined;
    const element = frame.current.querySelector<HTMLElement>(
      `[data-section="${CSS.escape(typing.sectionId)}"] [data-edit="${CSS.escape(typing.path)}"]`,
    );
    if (!element) return undefined;
    held.current = element;

    element.contentEditable = "true";
    element.spellcheck = true;
    if (typing.kind === "line") element.setAttribute("enterkeyhint", "done");
    element.dataset["typing"] = "yes";
    element.focus();

    /* The caret goes to the end rather than wherever the press landed inside a
       placeholder, which is the one thing that reads as broken. */
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const read = () =>
      typing.kind === "line" ? lineFrom(element) : runsFrom(element);

    const done = () => {
      onCommit.current(read());
      onClose.current();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose.current();
        return;
      }
      if (event.key === "Enter" && typing.kind === "line") {
        event.preventDefault();
        done();
        return;
      }
      if (event.key === "Enter" && !event.shiftKey && typing.kind === "rich") {
        /* A paragraph breaks its line rather than starting a new block, so what
           comes back is one field rather than a tree of divs. */
        event.preventDefault();
        document.execCommand("insertLineBreak");
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        if (typing.kind === "rich") document.execCommand("bold");
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
        event.preventDefault();
        if (typing.kind === "rich") document.execCommand("italic");
      }
    };

    const onPaste = (event: ClipboardEvent) => pasteAsText(event);

    element.addEventListener("keydown", onKey);
    element.addEventListener("paste", onPaste);
    element.addEventListener("blur", done);

    return () => {
      element.removeEventListener("keydown", onKey);
      element.removeEventListener("paste", onPaste);
      element.removeEventListener("blur", done);
      element.removeAttribute("contenteditable");
      delete element.dataset["typing"];
      held.current = null;
    };
    // The field being typed in is the whole of the dependency, and `where`
    // names it. `commit` and `close` are read from refs above.
  }, [frame, typing, where]);

  return held;
}

/** Bold, italic and a link, over the words being typed. */
function FormatBar({ onLink }: { onLink: () => void }) {
  const press = (command: string) => (event: React.MouseEvent) => {
    /* Pressing a button would take the caret out of the words, so the press is
       stopped before the browser moves the focus. */
    event.preventDefault();
    document.execCommand(command);
  };
  return (
    <div
      className={
        "pointer-events-auto flex items-center gap-1 rounded-lg border border-line"
        + " bg-surface p-1 shadow-md"
      }
    >
      <button type="button" aria-label={t("website.bold")} onMouseDown={press("bold")} className={CHROME_BUTTON}>
        <Bold className="size-4" aria-hidden />
      </button>
      <button type="button" aria-label={t("website.italic")} onMouseDown={press("italic")} className={CHROME_BUTTON}>
        <Italic className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={t("website.addLink")}
        onMouseDown={(event) => {
          event.preventDefault();
          onLink();
        }}
        className={CHROME_BUTTON}
      >
        <Link2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- the band --- */

function Insert({ at, onAddAt }: { at: number; onAddAt: (index: number) => void }) {
  return (
    /*
     * Above the website's own chrome. A church's header can be sticky, which
     * puts it on a layer of its own, and the first Add section sat half behind
     * it. The editor's own controls are always on top of the page they edit.
     */
    <div className="relative z-50 h-0">
      <div
        className={
          "pointer-events-none absolute inset-x-0 top-0 flex -translate-y-1/2 items-center"
          + " justify-center opacity-0 transition-opacity focus-within:opacity-100"
          + " hover:opacity-100 group-hover/canvas:opacity-100"
        }
      >
        <span aria-hidden className="h-px w-full bg-primary/30" />
        <button
          type="button"
          onClick={() => onAddAt(at)}
          className={
            "pointer-events-auto absolute inline-flex items-center gap-1.5 rounded-full"
            + " border border-primary bg-surface px-3 py-1.5 text-xs font-semibold"
            + " text-primary shadow-md transition-colors hover:bg-primary"
            + " hover:text-primary-fg focus-visible:outline focus-visible:outline-2"
            + " focus-visible:outline-offset-2 focus-visible:outline-primary"
          }
        >
          <Plus className="size-3.5" aria-hidden />
          {t("website.addSection")}
        </button>
      </div>
    </div>
  );
}

function Wrap({
  section,
  index,
  last,
  site,
  selected,
  dragging,
  over,
  handlers,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  section: SiteSection;
  index: number;
  last: boolean;
  site: SiteCtx;
  selected: boolean;
  dragging: boolean;
  over: "above" | "below" | null;
  handlers: CanvasHandlers;
  onDragStart: () => void;
  onDragOver: (where: "above" | "below") => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const kind = kindOf(section.type);
  const name = kind?.label ?? section.type;
  return (
    <div
      data-section={section.id}
      className={
        "relative outline-none transition-shadow"
        + (selected
          ? " z-10 shadow-[inset_0_0_0_2px_var(--color-primary)]"
          : " hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_55%,transparent)]")
        + (dragging ? " opacity-40" : "")
        + (section.hidden ? " opacity-55" : "")
      }
      onClick={() => handlers.onSelect({ sectionId: section.id, path: "" })}
      onDragOver={(event) => {
        event.preventDefault();
        const box = event.currentTarget.getBoundingClientRect();
        onDragOver(event.clientY < box.top + box.height / 2 ? "above" : "below");
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      {over ? (
        <span
          aria-hidden
          className={
            "absolute inset-x-0 z-50 h-[3px] bg-primary"
            + (over === "above" ? " top-0" : " bottom-0")
          }
        />
      ) : null}

      {/* The section's own controls, drawn only on the one being worked on. */}
      {selected ? (
        <div
          className="absolute right-3 top-3 z-50 flex items-center gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          <span
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", section.id);
              onDragStart();
            }}
            onDragEnd={onDragEnd}
            aria-hidden
            className={`${CHROME_BUTTON} cursor-grab active:cursor-grabbing`}
          >
            <GripVertical className="size-4" />
          </span>
          <Chrome label={t("website.changeLayout")} onPress={() => handlers.onLayout(section.id)}>
            <LayoutTemplate className="size-4" aria-hidden />
          </Chrome>
          <Chrome label={t("website.moveUp")} onPress={() => handlers.onMove(index, index - 1)} disabled={index === 0}>
            <ArrowUp className="size-4" aria-hidden />
          </Chrome>
          <Chrome label={t("website.moveDown")} onPress={() => handlers.onMove(index, index + 1)} disabled={last}>
            <ArrowDown className="size-4" aria-hidden />
          </Chrome>
          <Chrome label={t("website.duplicate")} onPress={() => handlers.onDuplicate(section.id)}>
            <Copy className="size-4" aria-hidden />
          </Chrome>
          <Chrome
            label={section.hidden ? t("website.show") : t("website.hide")}
            onPress={() => handlers.onHide(section.id)}
          >
            {section.hidden ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
          </Chrome>
          <Chrome label={t("website.removeSection")} onPress={() => handlers.onRemove(section.id)} tone="danger">
            <Trash2 className="size-4" aria-hidden />
          </Chrome>
        </div>
      ) : null}

      {/* What it is, so a church knows what it is working on. */}
      {selected ? (
        <span
          className={
            "absolute left-3 top-3 z-50 rounded-md bg-primary px-2 py-1 text-[11px]"
            + " font-semibold uppercase tracking-wide text-primary-fg"
          }
        >
          {name}
          {section.hidden ? ` - ${t("website.hidden")}` : ""}
        </span>
      ) : null}

      <SectionView section={section} site={site} />
    </div>
  );
}

/* ---------------------------------------------------------------- the canvas --- */

export function Canvas({
  doc,
  page,
  site,
  selected,
  handlers,
  onLink,
}: {
  doc: SiteDoc;
  page: SitePage;
  site: SiteCtx;
  selected: Selection | null;
  handlers: CanvasHandlers;
  /** Opens the dialog that asks where a link should go. */
  onLink: (at: { sectionId: string; path: string }) => void;
}) {
  const frame = React.useRef<HTMLDivElement | null>(null);
  const [typing, setTyping] = React.useState<Typing | null>(null);
  const [drag, setDrag] = React.useState<{ from: number; over: number | null; where: "above" | "below" | null }>(
    { from: -1, over: null, where: null },
  );

  const onField = React.useRef(handlers.onField);
  onField.current = handlers.onField;

  const commit = React.useCallback((value: unknown) => {
    if (!typing) return;
    onField.current(typing.sectionId, typing.path, value);
  }, [typing]);

  useTyping(frame, typing, commit, () => setTyping(null));

  /**
   * One listener for the whole page.
   *
   * A section is a pure component that writes `data-edit` and knows nothing
   * about being edited, so the editing lives here: the press is caught on the
   * way up, the nearest marked element says which field was pressed, and the
   * nearest wrapper says which section it belongs to.
   */
  const onPress = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-chrome]")) return;
    const field = target.closest<HTMLElement>("[data-edit]");
    const holder = target.closest<HTMLElement>("[data-section]");
    const sectionId = holder?.dataset["section"] ?? null;
    if (!field || !sectionId) return;
    const path = field.dataset["edit"] ?? "";
    const kind = field.dataset["editKind"] ?? "";
    event.stopPropagation();

    const already = selected?.sectionId === sectionId && selected.path === path;
    handlers.onSelect({ sectionId, path });

    /* The first press selects. The second opens the words for typing, which is
       the behaviour of every editor a volunteer has already met. */
    if (already && (kind === "line" || kind === "rich")) {
      setTyping({ sectionId, path, kind: kind as "line" | "rich" });
    }
  };

  const onDouble = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const field = target.closest<HTMLElement>("[data-edit]");
    const holder = target.closest<HTMLElement>("[data-section]");
    if (!field || !holder) return;
    const kind = field.dataset["editKind"] ?? "";
    if (kind !== "line" && kind !== "rich") return;
    event.preventDefault();
    event.stopPropagation();
    setTyping({
      sectionId: holder.dataset["section"]!,
      path: field.dataset["edit"] ?? "",
      kind: kind as "line" | "rich",
    });
  };

  const sections = page.sections;

  return (
    <div
      ref={frame}
      className="group/canvas relative"
      onClickCapture={(event) => {
        /* Nothing inside the canvas navigates: a link on the page is a thing to
           edit here, and following it would take the church out of the editor
           with unsaved work behind it. */
        const anchor = (event.target as HTMLElement).closest("a");
        if (anchor) event.preventDefault();
      }}
      onClick={onPress}
      onDoubleClick={onDouble}
    >
      <SiteFrame doc={doc}>
        <div
          data-section={HEADER}
          className={
            "relative outline-none transition-shadow"
            + (selected?.sectionId === HEADER
              ? " z-20 shadow-[inset_0_0_0_2px_var(--color-primary)]"
              : " hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_55%,transparent)]")
          }
          onClick={() => handlers.onSelect({ sectionId: HEADER, path: "" })}
        >
          <SiteHeaderView site={site} />
        </div>

        {/* The first one gets a little air, so it is not drawn on the
            header's own edge. */}
        <div className="h-3" aria-hidden />
        <Insert at={0} onAddAt={handlers.onAddAt} />

        {sections.map((section, index) => (
          <React.Fragment key={section.id}>
            <Wrap
              section={section}
              index={index}
              last={index === sections.length - 1}
              site={site}
              selected={selected?.sectionId === section.id}
              dragging={drag.from === index}
              over={drag.over === index ? drag.where : null}
              handlers={handlers}
              onDragStart={() => setDrag({ from: index, over: null, where: null })}
              onDragOver={(where) => setDrag((held) => ({ ...held, over: index, where }))}
              onDrop={() => {
                const { from, where } = drag;
                if (from >= 0 && from !== index) {
                  /* The bar sits above or below the section it is over, so the
                     landing place is that position or the one after it. Taking
                     the dragged section out first shifts everything below it up
                     by one, which is the second half of this. */
                  const wanted = where === "below" ? index + 1 : index;
                  handlers.onMove(from, from < wanted ? wanted - 1 : wanted);
                }
                setDrag({ from: -1, over: null, where: null });
              }}
              onDragEnd={() => setDrag({ from: -1, over: null, where: null })}
            />
            <Insert at={index + 1} onAddAt={handlers.onAddAt} />
          </React.Fragment>
        ))}

        {sections.length === 0 ? (
          <div className="grid place-items-center gap-4 p-16 text-center">
            <p className="m-0 text-fg-muted">{t("website.emptyPage")}</p>
          </div>
        ) : null}

        <div
          data-section={FOOTER}
          className={
            "relative outline-none transition-shadow"
            + (selected?.sectionId === FOOTER
              ? " z-20 shadow-[inset_0_0_0_2px_var(--color-primary)]"
              : " hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_55%,transparent)]")
          }
          onClick={() => handlers.onSelect({ sectionId: FOOTER, path: "" })}
        >
          <SiteFooterView site={site} />
        </div>
      </SiteFrame>

      {/* Bold, italic and a link, while a paragraph is open. */}
      {typing?.kind === "rich" ? (
        <div
          data-chrome
          className="pointer-events-none sticky bottom-4 z-50 flex justify-center"
        >
          <FormatBar
            onLink={() => onLink({ sectionId: typing.sectionId, path: typing.path })}
          />
        </div>
      ) : null}
    </div>
  );
}

/** What the canvas says while a field is open, for the toolbar's status. */
export const EDITING_HINT = "website.editingField";
