import { PersonPanelPage } from "../[id]/page-content";
import { EditPersonPanelPage } from "../[id]/edit/page-content";
import { NewPersonPanelPage } from "../new/page-content";
import { MailerPanelPage } from "../mailer/page-content";
import { CelebrationsPanelPage } from "../celebrations/page-content";
import { DuplicatesPanelPage } from "../duplicates/page-content";
import { ImportPanelPage } from "../import/page-content";

/**
 * R2.1, R24.6. Which window stands over the list for a given address.
 *
 * One place for all of them, because a dynamic segment claims any single name
 * and wins against a sibling that spells the name out. Giving each screen its
 * own `(.)name` entry looked right and never ran: the dynamic route matched
 * first, looked for a member called "mailer", and the screen 404ed.
 *
 * A name with no entry is a person. A sheet that opens in its own tab, under
 * `print`, is nobody's window and gets none.
 */
export function panelFor(
  segments: string[],
  params: Promise<{ id: string }>,
  searchParams: Promise<Record<string, string>>,
) {
  const [name, next] = segments;
  if (!name || name === "print" || next === "print") return null;

  if (name === "new") return <NewPersonPanelPage searchParams={searchParams} />;
  if (name === "mailer") return <MailerPanelPage searchParams={searchParams} />;
  if (name === "celebrations") return <CelebrationsPanelPage searchParams={searchParams} />;
  if (name === "duplicates") return <DuplicatesPanelPage searchParams={searchParams as never} />;
  if (name === "import") return <ImportPanelPage searchParams={searchParams} />;

  if (next === "edit") {
    return <EditPersonPanelPage params={params} searchParams={searchParams} />;
  }
  return <PersonPanelPage params={params} searchParams={searchParams} />;
}
