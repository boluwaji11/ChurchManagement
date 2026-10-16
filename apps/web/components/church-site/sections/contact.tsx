/**
 * HRT-379, R22.2. How to reach this church.
 *
 * Everything on it comes off the church's own record rather than out of the
 * section: the address, the email address and the telephone number are kept in
 * one place and read here, so a church that moves changes it once. The three
 * flags say which of them this particular section shows, and anything the
 * church has not filled in is left off the page.
 *
 * The map is a link to a map rather than a map. An embedded frame would put a
 * third party's script on a church's own page, and the thing a visitor wants is
 * directions on the device they will drive with.
 */

import type { ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { linkOf } from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";
import {
  Band, BODY, Btn, Btns, Card, Head, hrefFor, Inner, NothingYet, SUBHEAD,
  type SiteCtx,
} from "../kit";
import type { SectionViewProps } from "../section-props";
import { socialMarks, SocialRow } from "./social";

/** The church's address, as the lines it is written on. */
function addressLines(site: SiteCtx): string[] {
  const place = [site.address.city, site.address.region, site.address.postalCode]
    .filter((one): one is string => Boolean(one && one.trim()))
    .join(", ");
  return [site.address.line1, site.address.line2, place]
    .filter((one): one is string => Boolean(one && one.trim()));
}

/** One detail: its mark, and the thing itself. */
function Detail({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        className="mt-[0.2em] size-5 shrink-0 text-[var(--s-primary)]"
        aria-hidden
      />
      <div className={`${BODY} min-w-0 break-words`}>{children}</div>
    </div>
  );
}

function AddressBlock({ site }: { site: SiteCtx }) {
  const lines = addressLines(site);
  if (lines.length === 0) return null;
  return (
    <Detail icon={MapPin}>
      {lines.map((line, index) => (
        <span key={index} className="block">{line}</span>
      ))}
    </Detail>
  );
}

export function ContactSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const showAddress = content["showAddress"] === true;
  const showContact = content["showContact"] === true;
  const showSocial = content["showSocial"] === true;

  const emailHref = hrefFor(site, { kind: "email" });
  const phoneHref = hrefFor(site, { kind: "phone" });
  const mapHref = hrefFor(site, { kind: "map" });
  const lines = addressLines(site);

  const hasAddress = showAddress && lines.length > 0;
  const hasEmail = showContact && Boolean(emailHref) && Boolean(site.email);
  const hasPhone = showContact && Boolean(phoneHref) && Boolean(site.phone);
  const hasSocial = showSocial && socialMarks(site.doc.social).length > 0;
  const bare = !hasAddress && !hasEmail && !hasPhone && !hasSocial;

  const centred = section.variant === "band" || section.style?.align === "centre";
  const action = linkOf(content["action"]);

  /* The email address and the telephone number read as themselves, so the
     thing on screen is the thing a visitor copies down. */
  const reach = (
    <>
      {hasEmail && site.email ? (
        <Detail icon={Mail}>
          <Btn
            value={{ label: site.email, to: { kind: "email" } }}
            site={site}
            tone="quiet"
          />
        </Detail>
      ) : null}
      {hasPhone && site.phone ? (
        <Detail icon={Phone}>
          <Btn
            value={{ label: site.phone, to: { kind: "phone" } }}
            site={site}
            tone="quiet"
          />
        </Detail>
      ) : null}
    </>
  );

  const directions = mapHref ? (
    <Btn
      value={{ label: t("website.part.directions"), to: { kind: "map" } }}
      site={site}
      tone="secondary"
    />
  ) : null;

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide={section.variant === "withMap"}>
        {section.variant === "withMap" ? (
          <div className="grid grid-cols-1 items-start gap-[calc(var(--s-gap)*1.4)] lg:grid-cols-2">
            <div className="flex flex-col gap-[calc(var(--s-gap)*1.1)]">
              <Head content={content} site={site} />
              {bare ? (
                <NothingYet site={site}>{t("website.empty.contact")}</NothingYet>
              ) : (
                <div className="flex flex-col gap-4">
                  {reach}
                  {hasSocial ? <SocialRow site={site} className="pt-1" /> : null}
                </div>
              )}
              {action ? (
                <Btns>
                  <Btn value={action} at="action" site={site} />
                </Btns>
              ) : null}
            </div>
            {hasAddress ? (
              <Card className="flex flex-col gap-5">
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-[var(--s-button-corner)] bg-[var(--s-primary-soft)]"
                    aria-hidden
                  >
                    <MapPin className="size-5 text-[var(--s-primary)]" />
                  </span>
                  <p className={`${SUBHEAD} m-0`}>
                    {lines.map((line, index) => (
                      <span key={index} className="block">{line}</span>
                    ))}
                  </p>
                </div>
                {directions ? <Btns>{directions}</Btns> : null}
              </Card>
            ) : null}
          </div>
        ) : (
          <div
            className={`flex flex-col gap-[calc(var(--s-gap)*1.2)] ${
              centred ? "items-center text-center" : ""
            }`}
          >
            <Head content={content} site={site} centred={centred} />
            {bare ? (
              <NothingYet site={site}>{t("website.empty.contact")}</NothingYet>
            ) : section.variant === "band" ? (
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-10">
                <AddressBlock site={site} />
                {reach}
                {hasSocial ? <SocialRow site={site} /> : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-[calc(var(--s-gap)*1.1)] sm:grid-cols-2 lg:grid-cols-3">
                {hasAddress ? (
                  <div className="flex flex-col gap-4">
                    <AddressBlock site={site} />
                    {directions ? <Btns>{directions}</Btns> : null}
                  </div>
                ) : null}
                {hasEmail || hasPhone ? (
                  <div className="flex flex-col gap-4">{reach}</div>
                ) : null}
                {hasSocial ? <SocialRow site={site} /> : null}
              </div>
            )}
            {action ? (
              <Btns className={centred ? "justify-center" : ""}>
                <Btn value={action} at="action" site={site} />
              </Btns>
            ) : null}
          </div>
        )}
      </Inner>
    </Band>
  );
}
