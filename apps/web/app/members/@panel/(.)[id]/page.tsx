import { PersonPanelPage } from "../../[id]/page-content";
import { isMemberScreen } from "../../route-names";

export default async function InterceptedPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  /* R2.1. A screen's own name is not a person, so the panel stands aside and
     the page under it answers. */
  const { id } = await params;
  if (isMemberScreen(id)) return null;

  return (
    <PersonPanelPage params={params} searchParams={searchParams} />
  );
}
