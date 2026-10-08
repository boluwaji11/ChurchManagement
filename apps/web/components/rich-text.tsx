"use client";

import * as React from "react";
import {
  Bold, IndentDecrease, IndentIncrease, Italic, Link2, List, ListOrdered,
  Redo2, RemoveFormatting, Undo2,
} from "lucide-react";
import {
  Button, Field, IconButton, Input, cn,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  LETTER_FACE, LETTER_FONTS, faceOf, type LetterFont,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { htmlToMarkdown, markdownToHtml } from "@/lib/rich-text";

/**
 * R9.2. A description somebody can lay out, as they lay it out.
 *
 * The box is editable in place, so bold looks bold while it is being typed
 * rather than showing the marks around it. What is kept is markdown: the HTML
 * the browser hands back is turned into it on every keystroke and written to a
 * hidden field, so nothing a volunteer pastes can ever become a tag on a page a
 * member reads.
 *
 * The toolbar sits inside the field, above the text, because it belongs to this
 * box rather than to the form.
 */
export function RichText({
  name,
  defaultValue,
  className,
  minHeight = 160,
  maxHeight,
  onChange,
  insert,
  font,
  onFont,
}: {
  /** Left out where the value is read through onChange rather than a form. */
  name?: string;
  /** Markdown, as it is stored. */
  defaultValue: string;
  className?: string;
  minHeight?: number;
  /** Past this the box keeps its height and the text scrolls inside it. */
  maxHeight?: number;
  /**
   * R16.12. The markdown, on every keystroke.
   *
   * A form reads this box through its hidden field. A screen that builds an
   * address out of what was typed needs the value itself.
   */
  onChange?: (markdown: string) => void;
  /**
   * R16.12. A way to write text in wherever the caret is.
   *
   * Handed back so a field chip outside the box can put its mark where the
   * writer was, rather than at the end of everything they have written.
   */
  insert?: (put: (text: string) => void) => void;
  /**
   * R16.12. The typeface the whole box is set in.
   *
   * Left out everywhere the words are a description rather than a letter.
   * What is stored is markdown, which carries no font, so this belongs to the
   * thing being written rather than to a run of words inside it.
   */
  font?: LetterFont;
  onFont?: (next: LetterFont) => void;
}) {
  const box = React.useRef<HTMLDivElement>(null);
  const [markdown, setMarkdown] = React.useState(defaultValue);
  const [marks, setMarks] = React.useState({ bold: false, italic: false });
  const [asking, setAsking] = React.useState(false);
  const [href, setHref] = React.useState("https://");
  // The selection is lost the moment a dialog takes focus, so it is held here
  // and put back when the address comes in.
  const picked = React.useRef<Range | null>(null);

  // Written once. Afterwards the browser owns the contents, and re-rendering
  // into it would put the caret back at the start on every keystroke.
  React.useEffect(() => {
    if (box.current) box.current.innerHTML = markdownToHtml(defaultValue);
  }, [defaultValue]);

  const read = () => {
    if (!box.current) return;
    const next = htmlToMarkdown(box.current);
    setMarkdown(next);
    onChange?.(next);
  };

  /* R16.12. Text written in at the caret, which is where the writer is. */
  React.useEffect(() => {
    if (!insert) return;
    insert((text: string) => {
      box.current?.focus();
      document.execCommand("insertText", false, text);
      read();
    });
    // The caller holds the function; it does not change between renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insert]);

  /** Which marks the caret is sitting in, so the buttons show their state. */
  const sense = () => {
    try {
      setMarks({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
      });
    } catch {
      // Some browsers refuse the query outside an editable region.
    }
  };

  const run = (command: string, value?: string) => {
    box.current?.focus();
    document.execCommand(command, false, value);
    read();
    sense();
  };

  const askForLink = () => {
    const selection = window.getSelection();
    picked.current = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    setHref("https://");
    setAsking(true);
  };

  const makeLink = () => {
    setAsking(false);
    if (!/^https?:\/\//i.test(href)) return;

    const selection = window.getSelection();
    if (picked.current && selection) {
      selection.removeAllRanges();
      selection.addRange(picked.current);
    }
    run("createLink", href);
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--d-radius-control)] border border-line-strong bg-surface shadow-sm",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ring)]",
        className,
      )}
    >
      {name ? <input type="hidden" name={name} value={markdown} /> : null}

      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1">
        {onFont ? (
          <>
            <Select value={font ?? "inter"} onValueChange={(next) => onFont(next as LetterFont)}>
              <SelectTrigger
                aria-label={t("rich.font")}
                className="h-8 min-h-8 w-[168px] border-transparent bg-transparent px-2 text-[13px] shadow-none hover:bg-sunken"
                style={{ fontFamily: LETTER_FACE[faceOf(font)].css }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LETTER_FONTS.map((one) => (
                  <SelectItem
                    key={one}
                    value={one}
                    style={{ fontFamily: LETTER_FACE[one].css }}
                  >
                    {LETTER_FACE[one].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span aria-hidden className="mx-1 h-5 w-px bg-line" />
          </>
        ) : null}

        {/* R24.6. Undo and redo first, because the one thing somebody wants
            after a formatting button did the wrong thing is to take it back,
            and a toolbar with no way back teaches members not to press
            anything. The browser keeps the stack; this reaches it without
            asking anybody to remember a keystroke. */}
        <Mark label={t("rich.undo")} onPress={() => run("undo")}>
          <Undo2 />
        </Mark>
        <Mark label={t("rich.redo")} onPress={() => run("redo")}>
          <Redo2 />
        </Mark>

        <span aria-hidden className="mx-1 h-5 w-px bg-line" />

        <Mark label={t("rich.bold")} on={marks.bold} onPress={() => run("bold")}>
          <Bold />
        </Mark>
        <Mark label={t("rich.italic")} on={marks.italic} onPress={() => run("italic")}>
          <Italic />
        </Mark>
        {/* R16.12. A letter indents: an address block, a quoted line, a
            paragraph set in from the rest. The browser does this with a
            blockquote, which is what the stored text keeps. */}
        <Mark label={t("rich.outdent")} onPress={() => run("outdent")}>
          <IndentDecrease />
        </Mark>
        <Mark label={t("rich.indent")} onPress={() => run("indent")}>
          <IndentIncrease />
        </Mark>

        <span aria-hidden className="mx-1 h-5 w-px bg-line" />

        <Mark label={t("rich.bullets")} onPress={() => run("insertUnorderedList")}>
          <List />
        </Mark>
        <Mark label={t("rich.numbers")} onPress={() => run("insertOrderedList")}>
          <ListOrdered />
        </Mark>
        <Mark label={t("rich.link")} onPress={askForLink}>
          <Link2 />
        </Mark>

        {/* Undoing a bold otherwise means selecting it and pressing B again,
            which nobody finds. The links go with it, since a pasted address
            that should read as words is the other half of the same problem. */}
        <Mark
          label={t("rich.clear")}
          onPress={() => {
            run("removeFormat");
            run("unlink");
          }}
        >
          <RemoveFormatting />
        </Mark>
      </div>

      <div
        ref={box}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label={t("rich.body")}
        onInput={read}
        onBlur={read}
        onKeyUp={sense}
        onMouseUp={sense}
        // The browser is told to paste the words rather than the styling, so a
        // paragraph out of a document does not arrive carrying its own fonts.
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          read();
        }}
        className={cn(
          "px-[var(--d-pad-control-x)] py-2.5 text-[length:var(--d-text-body)] text-fg outline-none",
          "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5",
          "[&_strong]:font-semibold",
          maxHeight ? "overflow-y-auto" : "",
        )}
        style={{
          minHeight,
          maxHeight,
          fontFamily: font ? LETTER_FACE[faceOf(font)].css : undefined,
        }}
      />

      {/* R24.6. The address is asked for on a row of this editor rather than in
          a box over the panel. A dialog inside a panel is modal stacking, and
          closing it took the panel with it. */}
      {asking ? (
        <div className="flex flex-wrap items-end gap-2 border-t border-line bg-sunken/50 px-[var(--d-pad-control-x)] py-2.5">
          <Field label={t("rich.linkPrompt")} className="min-w-[200px] flex-1">
            <Input
              value={href}
              onChange={(event) => setHref(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  makeLink();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setAsking(false);
                }
              }}
              autoFocus
              inputMode="url"
            />
          </Field>
          <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
            {t("action.cancel")}
          </Button>
          <Button type="button" onClick={makeLink}>{t("rich.linkAdd")}</Button>
        </div>
      ) : null}

    </div>
  );
}

function Mark({
  label,
  on,
  onPress,
  children,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <IconButton
      label={label}
      variant="ghost"
      aria-pressed={on}
      className={on ? "bg-sunken text-fg" : undefined}
      // Pressed before focus leaves the text, so the selection survives.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPress}
    >
      {children}
    </IconButton>
  );
}
