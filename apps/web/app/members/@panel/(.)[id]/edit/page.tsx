import { EditPersonPanelPage } from "../../../[id]/edit/page-content";

export default function InterceptedEditPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <EditPersonPanelPage params={params} searchParams={searchParams} />
  );
}
