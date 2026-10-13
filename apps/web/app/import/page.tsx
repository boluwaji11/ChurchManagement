import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * R19.x, R24.6. The importer moved under Members, where it opens in the window
 * over the list. This address is kept because churches have it written down and
 * a link in an email should not meet a 404.
 */
export default function ImportMoved() {
  redirect("/members/import");
}
