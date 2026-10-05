"use client";

import * as React from "react";
import { Bold, Italic, List, ListOrdered, Link2, RemoveFormatting } from "lucide-react";
import {
  Button, Dialog, DialogContent, DialogFooter, Field, IconButton, Input, cn,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
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
}: {
  name: string;
  /** Markdown, as it is stored. */
  defaultValue: string;
  className?: string;
  minHeight?: number;
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
    if (box.current) setMarkdown(htmlToMarkdown(box.current));
  };

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
      <input type="hidden" name={name} value={markdown} />

      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1">
        <Mark label={t("rich.bold")} on={marks.bold} onPress={() => run("bold")}>
          <Bold />
        </Mark>
        <Mark label={t("rich.italic")} on={marks.italic} onPress={() => run("italic")}>
          <Italic />
        </Mark>
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
        )}
        style={{ minHeight }}
      />

      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent title={t("rich.link")} closeLabel={t("common.close")}>
          <Field label={t("rich.linkPrompt")}>
            <Input
              value={href}
              onChange={(event) => setHref(event.target.value)}
              autoFocus
              inputMode="url"
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAsking(false)}>{t("action.cancel")}</Button>
            <Button onClick={makeLink}>{t("action.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
