import Link from "next/link";
import { notFound } from "next/navigation";
import { publicChurch, publicGroups } from "@connectapp/db";
import { Card } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { supabaseServer } from "@/lib/supabase/server";
import { GroupLine } from "../line";
import { publicTab } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return publicTab(t("nav.groups"), slug);
}

/**
 * R9.5. The same group finder, inside the church's own page.
 *
 * No brand rule, no church name and no page padding, because the page around
 * it is already the church's and the iframe is sized by the snippet. A group
 * opens in the whole window rather than inside the frame, because a group's
 * own page is a page rather than a panel.
 */
export default async function EmbeddedGroupsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const church = await publicChurch(slug);
  if (!church) notFound();

  const groups = await publicGroups(slug);

  const photos = new Map<string, string>();
  const withPhotos = groups.filter((group) => group.photoKey);
  if (withPhotos.length > 0) {
    const supabase = await supabaseServer();
    for (const group of withPhotos) {
      const signed = await supabase.storage
        .from("church")
        .createSignedUrl(group.photoKey!, 3600);
      if (signed.data?.signedUrl) photos.set(group.id, signed.data.signedUrl);
    }
  }

  return (
    <main data-theme="light" id="main" className="w-full p-4">
      {groups.length === 0 ? (
        <Empty icon="group" title={t("publicGroups.none")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Card className="relative flex h-full flex-col gap-2 overflow-hidden transition-shadow focus-within:shadow-md hover:shadow-md">
                {photos.get(group.id) ? (
                  <img
                    src={photos.get(group.id)}
                    alt=""
                    className="-mx-[var(--d-pad-card)] -mt-[var(--d-pad-card)] mb-1 h-32 w-[calc(100%+2*var(--d-pad-card))] object-cover"
                  />
                ) : null}

                <Link
                  href={`/g/${slug}/${group.slug}`}
                  target="_top"
                  className="text-heading text-fg after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none"
                >
                  {group.name}
                </Link>

                <GroupLine group={group} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
