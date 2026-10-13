import { EditGroupPanelPage } from "../../../[id]/edit/page-content";

/** R9.5, R24.6. The edit form, on a press from the group. */
export default function InterceptedEditGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  return <EditGroupPanelPage params={params} searchParams={searchParams} />;
}
