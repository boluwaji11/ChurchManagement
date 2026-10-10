"use client";

import * as React from "react";
import { CircleHelp } from "lucide-react";
import {
  Button, IconButton, Sheet, SheetTrigger, SheetContent,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R22.2, R24.6. What one field is, for whoever has not met it before.
 *
 * A mark on the label's line that opens the panel from the right. The words go
 * there rather than under the box, because a sentence under every field is a
 * form that shouts at the ninety-nine volunteers who already knew what their
 * church's EIN is, and the hundredth has nowhere to look.
 *
 * The screen's own Help is a different thing: it explains the screen. This
 * explains the box.
 */
export function FieldHint({
  /** A catalogue stem, whose title and body keys hold the words. */
  about,
  /** What the mark is called, since the mark itself says nothing. */
  label,
}: {
  about: string;
  label: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <IconButton
          label={label}
          variant="ghost"
          className="size-6 min-h-0 [&_svg]:size-[15px]"
        >
          <CircleHelp />
        </IconButton>
      </SheetTrigger>

      <SheetContent
        title={t(`${about}.title` as never)}
        closeLabel={t("common.close")}
        footer={
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {t("common.close")}
          </Button>
        }
      >
        {/* Each paragraph of the article is its own line in the catalogue,
            split on a blank line the way the screen help does it. */}
        {t(`${about}.body` as never)
          .split("\n\n")
          .map((para) => (
            <p key={para} className="text-[length:var(--d-text-body)] leading-6 text-fg-muted">
              {para}
            </p>
          ))}
      </SheetContent>
    </Sheet>
  );
}
