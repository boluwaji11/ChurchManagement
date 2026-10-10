import { notFound } from "next/navigation";
import { publicChurch, publicGroup } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";
import { GroupPublicPage } from "@/components/group-public-page";

/**
 * R9.5. One group, for a church that wants to link straight to it.
 *
 * One screen for both ways in: the church's own address, where the host names
 * the church and the path names only the group, and ours, where the path has
 * to carry both.
 */
export async function GroupScreen({ slug, id }: { slug: string; id: string }) {
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
