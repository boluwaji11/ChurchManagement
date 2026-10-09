"use client";

import { MessageSquare } from "lucide-react";
import { Button, Tooltip } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/** The event a record's own press raises, which the launcher is listening for. */
export const OPEN_INBOX = "connectapp:inbox";

export interface OpenInbox {
  /** The conversation's address: a person's own, or a group's or a team's. */
  at: string;
  /** What to call it while its lines are on their way. */
  name?: string;
}

/**
 * R16.9. Writing to whoever this record is for, from the record.
 *
 * A church that wants to ask one person something opens that person and looks
 * for the way to ask, so the action belongs on their page. It opens the panel
 * in the corner on that conversation rather than leaving the record: the
 * errand is one line about the person on screen, and coming back afterwards
 * should not be a press of the back button.
 */
export function WriteTo({ at, name }: OpenInbox) {
  return (
    <Tooltip content={t("message.open")}>
      {/* Sized from the same token as the icons beside it, so the actions on a
          record page are one row of shapes rather than several. */}
      <Button
        variant="ghost"
        type="button"
        aria-label={t("message.open")}
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent<OpenInbox>(OPEN_INBOX, { detail: { at, name } }),
          );
        }}
        className="size-[var(--d-tap)] min-h-0 rounded-[var(--d-radius-control)] px-0 [&_svg]:size-[var(--d-icon)]"
      >
        <MessageSquare />
      </Button>
    </Tooltip>
  );
}
