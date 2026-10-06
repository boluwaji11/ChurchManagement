import Link from "next/link";
import { notFound } from "next/navigation";
import { publicChurch, publicGroups } from "@connectapp/db";
import { Card } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { BrandRuleFor } from "@/components/brand-rule";
import { supabaseServer } from "@/lib/supabase/server";
import { GroupLine } from "./line";

export const dynamic = "force-dynamic";

/**
 * R9.5. The groups page a church links to from its own website.
 *
 * Whoever follows that link has no account and should not need one to find out
 * that there is a Tuesday group for parents of young children. The finder
 * behind sign-in answers the member's question; this answers the stranger's.
 *
 * No leader names and no roster. Publishing a volunteer's name on the open web
 * is a different act from naming them inside the church, and not one a church
 * has asked for.
 */
export default async function PublicGroupsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const church = await publicChurch(slug);
  if (!church) notFound();

  const groups = await publicGroups(slug);

  // The bucket is private, so each picture is served through a signed link.
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
    <div data-theme="light" className="site-wash flex min-h-dvh flex-col">
      <BrandRuleFor hue={church.brandHue} className="h-1.5 w-full" />

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="mb-8 font-display text-display text-fg">
          {t("publicGroups.title", { church: church.name })}
        </h1>

        {groups.length === 0 ? (
          <Empty icon="group" title={t("publicGroups.none")}
          body={t("publicGroups.none.body")} />
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
                    href={`/g/${slug}/${group.id}`}
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

        <p className="mt-10 text-caption text-fg-muted">
          {t("publicGroups.contact")}
          {church.phone ? ` ${church.phone}` : ""}
        </p>

        {church.website ? (
          <p className="mt-2">
            <a
              href={church.website}
              className="text-label text-fg-muted underline hover:text-fg"
            >
              {church.name}
            </a>
          </p>
        ) : null}
      </main>
    </div>
  );
}
