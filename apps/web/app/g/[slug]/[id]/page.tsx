import { notFound } from "next/navigation";
import { publicChurch, publicGroup } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";
import { GroupPublicPage } from "@/components/group-public-page";

export const dynamic = "force-dynamic";

/**
 * R9.5. One group, for a church that wants to link straight to it.
 *
 * The same rule as the list it came from: what it is, when it meets, roughly
 * how big it is, and nothing about the members in it.
 */
export default async function PublicGroupPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const church = await publicChurch(slug);
  if (!church) notFound();

  const group = await publicGroup(slug, id);
  if (!group) notFound();

  const supabase = await supabaseServer();
  const sign = async (key: string | null) => {
    if (!key) return null;
    const signed = await supabase.storage.from("church").createSignedUrl(key, 3600);
    return signed.data?.signedUrl ?? null;
  };

  return (
    <GroupPublicPage
      church={church}
      group={group}
      photoUrl={await sign(group.photoKey)}
      logoUrl={await sign(church.logoKey)}
    />
  );
}
