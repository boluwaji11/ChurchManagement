import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button, Tooltip } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R16.9. Writing to whoever this record is for, from the record.
 *
 * A church that wants to ask one person something opens that person and looks
 * for the way to ask, so the action belongs on their page rather than only in
 * the inbox. The address is who it is with, so the press opens the
 * conversation that already exists rather than starting a second one.
 *
 * Which inbox it opens is the reader's own: staff answer for the church, and
 * everybody else reads theirs in the portal.
 */
export function WriteTo({
  church,
  at,
  office,
}: {
  church: string;
  /** The conversation's address: a person's own, or a group's or a team's. */
  at: string;
  /** Whether this reader answers for the church. */
  office: boolean;
}) {
  return (
    <Tooltip content={t("message.open")}>
      {/* Sized from the same token as the icons beside it, so the actions on a
          record page are one row of shapes rather than several. */}
      <Button
        variant="ghost"
        asChild
        className="size-[var(--d-tap)] min-h-0 rounded-[var(--d-radius-control)] px-0 [&_svg]:size-[var(--d-icon)]"
      >
        <Link
          href={`${office ? "/messages" : "/home/messages"}/${at}?church=${church}`}
          aria-label={t("message.open")}
        >
          <MessageSquare />
        </Link>
      </Button>
    </Tooltip>
  );
}
