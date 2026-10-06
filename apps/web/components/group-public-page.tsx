import Link from "next/link";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { PublicChurch, PublicGroup } from "@connectapp/db";
import { mapsHref } from "@/lib/address";
import { GroupLine } from "@/app/g/[slug]/line";
import { PublicFooter } from "@/components/public-footer";

/**
 * R9.5. A group as the open web sees it.
 *
 * One component, so the page a church links to and the preview a church looks
 * at before publishing cannot drift apart. Drawn the way the event page is
 * drawn, because a reader meeting both should meet one product.
 */
export function GroupPublicPage({
  church,
  group,
  photoUrl,
  logoUrl,
  banner,
}: {
  church: PublicChurch;
  group: PublicGroup;
  photoUrl: string | null;
  logoUrl: string | null;
  /** Shown above everything on the preview, to say this is not the live page. */
  banner?: React.ReactNode;
}) {
  return (
    <div data-theme="light" className="site-wash flex min-h-dvh flex-col">
      {banner}

      <header className="sticky top-0 z-20 border-b border-line bg-[color-mix(in_oklch,var(--canvas)_88%,transparent)] backdrop-blur-[10px] px-5 py-3 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              aria-hidden
              className="size-11 rounded-xl border border-line bg-surface object-contain p-1"
            />
          ) : null}
          <span className="font-display text-[22px] leading-7 text-fg">{church.name}</span>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 pt-4 pb-10 sm:px-8 sm:pt-5 sm:pb-12">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            className="aspect-[5/2] w-full rounded-[14px] object-cover"
          />
        ) : (
          /* No picture, so the group kind's colour fills the same space. */
          <span
            aria-hidden
            className="block aspect-[5/2] w-full rounded-[14px]"
            style={{ background: `var(--hue-${group.typeHue ?? "sky"}-tint)` }}
          />
        )}

        <div className="mt-8 flex flex-col gap-7">
          <div className="flex flex-col gap-2.5 border-b border-line pb-7">
            <h1 className="font-display text-[30px] leading-[36px] text-fg sm:text-[36px] sm:leading-[42px]">
              {group.name}
            </h1>
            <GroupLine group={group} />

            {group.address ? (
              <p className="text-[length:var(--d-text-body)] leading-6 text-fg-muted">
                {group.address}
              </p>
            ) : null}
            {group.address && group.mappable ? (
              <a
                href={mapsHref(group.address)}
                target="_blank"
                rel="noreferrer noopener"
                className="self-start font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("common.directions")}
              </a>
            ) : null}
          </div>

          {group.description ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-[12px] font-bold tracking-[0.06em] text-fg uppercase">
                {t("event.about")}
              </h2>
              <p className="max-w-[68ch] whitespace-pre-wrap text-[length:var(--d-text-body)] leading-7 text-fg">
                {group.description}
              </p>
            </section>
          ) : null}

          {/* R9.5. The whole point of publishing a group. Somebody with no
              account presses this and ends up in it: the address behind it
              creates the account, puts them in the church and asks the leader. */}
          {group.openToJoin && !group.full ? (
            <Button asChild className="min-h-12 self-start px-6 text-[16px]">
              <Link href={`/g/${church.slug}/${group.slug}/join`}>
                {t("publicGroups.join")}
              </Link>
            </Button>
          ) : group.full ? (
            <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("find.full")}</p>
          ) : null}

        </div>
      </main>

      <PublicFooter church={church} />
    </div>
  );
}
