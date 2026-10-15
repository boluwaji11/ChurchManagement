import { EditEventPanelPage } from "../../../[id]/edit/page-content";

/** R14.1, R24.6. The edit form, on a press from the event. */
export default function InterceptedEditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  return <EditEventPanelPage params={params} searchParams={searchParams} />;
}
