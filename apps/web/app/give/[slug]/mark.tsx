import { t } from "@connectapp/i18n";
import { Tooltip } from "@connectapp/ui";

/**
 * R1.1, R13.6. The church at the head of its own giving page.
 *
 * Its mark where it has uploaded one, and the first letter of its name in its
 * own colour where it has not. With a website on the record the mark opens
 * it: somebody who lands here from a link and wants to know who they are
 * giving to reaches for the logo first.
 */
export function Mark({
  name,
  logoUrl,
  hue,
  homepage,
}: {
  name: string;
  logoUrl: string | null;
  hue: string;
  /** The church's own website, where it has given one. */
  homepage: string | null;
}) {
  const mark = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" className="size-14 rounded-[14px] object-cover" />
  ) : (
    <span
      aria-hidden
      className="grid size-14 place-items-center rounded-[14px] font-display text-[24px] text-primary-fg"
      style={{ background: `var(--hue-${hue}-key)` }}
    >
      {name.slice(0, 1)}
    </span>
  );

  if (!homepage) return mark;

  return (
    <Tooltip content={t("portal.churchSite", { church: name })}>
      <a
        href={homepage}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={t("portal.churchSite", { church: name })}
        className="rounded-[14px] transition-transform hover:scale-[1.03]"
      >
        {mark}
      </a>
    </Tooltip>
  );
}
