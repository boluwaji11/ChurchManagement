import { PersonPanelPage } from "../../[id]/page-content";

export default function InterceptedPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <PersonPanelPage params={params} searchParams={searchParams} />
  );
}
