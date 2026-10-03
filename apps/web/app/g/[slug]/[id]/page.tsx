import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { publicChurch, publicGroup } from "@hearth/db";
import { Card } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { BrandRuleFor } from "@/components/brand-rule";
import { supabaseServer } from "@/lib/supabase/server";
import { GroupLine } from "../line";

export const dynamic = "force-dynamic";

/**
 * R9.5. One group, for a church that wants to link straight to it.
 *
 * The same rule as the list it came from: what it is, when it meets, roughly
 * how big it is, and nothing about the people in it.
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

  let photoUrl: string | null = null;
  if (group.photoKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage.from("church").createSignedUrl(group.photoKey, 3600);
    photoUrl = signed.data?.signedUrl ?? null;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <BrandRuleFor hue={church.brandHue} className="h-1.5 w-full" />

      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <Link
          href={`/g/${slug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> {t("publicGroups.back")}
        </Link>

        <Card className="flex flex-col gap-3 overflow-hidden">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="-mx-[var(--d-pad-card)] -mt-[var(--d-pad-card)] mb-1 h-56 w-[calc(100%+2*var(--d-pad-card))] object-cover"
            />
          ) : null}

          <h1 className="font-display text-display text-fg">{group.name}</h1>
          <GroupLine group={group} />

          {group.address ? (
            <span className="text-[length:var(--d-text-body)] text-fg">{group.address}</span>
          ) : null}

          {group.description ? (
            <p className="whitespace-pre-wrap text-[length:var(--d-text-body)] text-fg">
              {group.description}
            </p>
          ) : null}
        </Card>

        <p className="mt-8 text-caption text-fg-muted">
          {t("publicGroups.contact")}
          {church.phone ? ` ${church.phone}` : ""}
        </p>
      </main>
    </div>
  );
}
