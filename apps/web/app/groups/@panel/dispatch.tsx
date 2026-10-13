import { GroupPanelPage } from "../[id]/page-content";
import { EditGroupPanelPage } from "../[id]/edit/page-content";
import { NewGroupPanelPage } from "../new/page-content";

/**
 * R9.5, R24.6. Which window stands over the groups list for a given address.
 *
 * One place for all of them, because a dynamic segment claims any single name
 * and wins against a sibling that spells the name out, so `new` would be
 * looked up as a group and found to be nobody.
 */
export function panelFor(
  segments: string[],
  params: Promise<{ id: string }>,
  searchParams: Promise<Record<string, string>>,
) {
  const [name, next] = segments;
  if (!name) return null;

  if (name === "new") return <NewGroupPanelPage searchParams={searchParams} />;
  if (next === "edit") {
    return <EditGroupPanelPage params={params} searchParams={searchParams} />;
  }
  return <GroupPanelPage params={params} searchParams={searchParams} />;
}
