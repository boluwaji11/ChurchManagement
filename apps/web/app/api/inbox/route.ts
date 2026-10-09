import { requireSession } from "@/lib/session";
import { readInbox } from "@/lib/inbox-read";

export const dynamic = "force-dynamic";

/**
 * R16.9. What the inbox says right now.
 *
 * The panel asks this every few seconds while it is open, so a reply lands on
 * the other side without anybody reloading the page. The same answer the
 * server already put into the page, through the same reader.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await requireSession(url.searchParams.get("church") ?? undefined);

  return Response.json(
    await readInbox(session, {
      key: url.searchParams.get("key"),
      archived: url.searchParams.get("archived") === "1",
      reading: url.searchParams.get("reading") === "1",
    }),
  );
}
