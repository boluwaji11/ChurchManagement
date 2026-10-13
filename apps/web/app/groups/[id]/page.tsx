import { generateMetadata } from "./page-content";
import { GroupsUnder } from "../under";

export const dynamic = "force-dynamic";
export { generateMetadata };

/* R9.5, R24.6. The list, with this group's window standing over it. */
export default function GroupRoutePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <GroupsUnder searchParams={searchParams} />;
}
