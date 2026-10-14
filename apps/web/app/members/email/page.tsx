import { generateMetadata } from "./page-content";
import { MembersUnder } from "../under";

export const dynamic = "force-dynamic";
export { generateMetadata };

/* R16.4, R24.6. The list, with this screen's window standing over it. The
   window itself is drawn by the panel slot, which answers every address under
   /members whether it was pressed for or loaded. */
export default function EmailRoutePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MembersUnder searchParams={searchParams} />;
}
