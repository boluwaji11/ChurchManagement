import { EventPanelPage } from "../[id]/page-content";
import { EditEventPanelPage } from "../[id]/edit/page-content";
import { NewEventPanelPage } from "../new/page-content";

/**
 * R14.1, R24.6. Which window stands over the events list for a given address.
 *
 * The roster sheet, the preview and the export open in their own tab, which is
 * a fresh load rather than an interception, so they get no window.
 */
const ITS_OWN_TAB = ["roster", "preview", "export"];

export function panelFor(
  segments: string[],
  params: Promise<{ id: string }>,
  searchParams: Promise<Record<string, string>>,
) {
  const [name, next] = segments;
  if (!name) return null;
  if (next && ITS_OWN_TAB.includes(next)) return null;

  if (name === "new") return <NewEventPanelPage searchParams={searchParams} />;
  if (next === "edit") {
    return <EditEventPanelPage params={params} searchParams={searchParams} />;
  }
  return <EventPanelPage params={params} searchParams={searchParams} />;
}
