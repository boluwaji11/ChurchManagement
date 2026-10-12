import { PersonPanelPage } from "../../[id]/page-content";
import { NewPersonPanelPage } from "../../new/page-content";
import { MailerPanelPage } from "../../mailer/page-content";
import { CelebrationsPanelPage } from "../../celebrations/page-content";
import { DuplicatesPanelPage } from "../../duplicates/page-content";

/**
 * R2.1, R24.6. Everything under /members opens in the window over the list.
 *
 * One intercepting route for all of them, because a dynamic segment claims any
 * single name and wins against a sibling that spells the name out. Giving each
 * screen its own `(.)name` entry looked right and never ran: this route matched
 * first, looked for a member called "mailer", and the screen 404ed.
 *
 * So the names are answered here. A name with no entry is a person.
 */
export default async function InterceptedMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params;

  if (id === "new") return <NewPersonPanelPage searchParams={searchParams} />;
  if (id === "mailer") return <MailerPanelPage searchParams={searchParams} />;
  if (id === "celebrations") return <CelebrationsPanelPage searchParams={searchParams} />;
  if (id === "duplicates") return <DuplicatesPanelPage searchParams={searchParams as never} />;

  return <PersonPanelPage params={params} searchParams={searchParams} />;
}
