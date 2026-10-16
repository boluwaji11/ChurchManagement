/**
 * HRT-379, R22.2. Where this church meets, and how to get there.
 *
 * The address comes off the church's own record, so a church that moves changes
 * it once. A church whose meeting place is not its postal address writes one
 * here by hand and that wins.
 *
 * The panel stands in for a map, drawn here in the church's own colours. A map
 * frame from another company loads its own scripts, sets its own cookies and
 * asks the visitor for consent the church agreed to on their behalf, so the
 * directions button hands the visitor to a map at the moment they ask for one.
 */

import * as React from "react";
import { MapPin, Navigation } from "lucide-react";
import { t } from "@connectapp/i18n";
import { linkOf, richOf, textOf } from "@connectapp/db/rules";
import type { SiteLink } from "@connectapp/db/rules";
import {
  Band, BODY, Btn, Btns, Card, Head, Inner, NothingYet, P, T, hrefFor, richIsEmpty,
} from "../kit";
import type { SectionViewProps } from "../section-props";

/**
 * The button that hands the visitor to a map.
 *
 * Built per render rather than at module scope, because a string read before
 * the host has registered its spelling comes back in the wrong one.
 */
const directionsLink = (): SiteLink => ({
  label: t("website.part.directions"),
  to: { kind: "map" },
  tone: "primary",
});

export function LocationSection({ section, site }: SectionViewProps) {
  const written = textOf(section.content["address"]);
  const lines = written
    ? written.split("\n").map((line) => line.trim()).filter(Boolean)
    : [
        site.address.line1,
        site.address.line2,
        [site.address.city, site.address.region].filter(Boolean).join(", "),
        site.address.postalCode,
      ].map((line) => (line ?? "").trim()).filter(Boolean);

  const directions = richOf(section.content["directions"]);
  const action = linkOf(section.content["action"]);
  const variant = section.variant;
  /* A hand-written address is as good as one on the record, so the panel is
     drawn for either. The flag is what turns it on for the plain layout. */
  const wantsPanel = variant !== "plain" || section.content["showMap"] === true;
  const nothing = lines.length === 0 && richIsEmpty(directions);
  /* No address on the record means no map to send anybody to, so the button
     stays off the page rather than pointing at a search for nothing. */
  const mapped = hrefFor(site, { kind: "map" }) !== null;

  const words = () => (
    <div className="flex flex-col gap-[var(--s-gap)]">
      <Head content={section.content} site={site} />
      {nothing ? (
        <NothingYet site={site}>{t("website.empty.location")}</NothingYet>
      ) : (
        <>
          <Address lines={lines} site={site} written={Boolean(written)} />
          <P
            value={directions}
            at="directions"
            site={site}
            className={`${BODY} text-[var(--s-muted)]`}
          />
        </>
      )}
      <Btns>
        {mapped ? <Btn value={directionsLink()} site={site} /> : null}
        {action ? <Btn value={action} at="action" site={site} tone="secondary" /> : null}
      </Btns>
    </div>
  );

  if (variant === "mapFull") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="flex flex-col gap-[calc(var(--s-gap)*1.4)]">
            <Head content={section.content} site={site} centred />
            {nothing ? (
              <NothingYet site={site}>{t("website.empty.location")}</NothingYet>
            ) : (
              <Panel tall>
                <Card className="flex max-w-[44ch] flex-col gap-4">
                  <Address lines={lines} site={site} written={Boolean(written)} />
                  <P
                    value={directions}
                    at="directions"
                    site={site}
                    className={`${BODY} text-[var(--s-muted)]`}
                  />
                  <Btns>
                    {mapped ? <Btn value={directionsLink()} site={site} /> : null}
                    {action ? (
                      <Btn value={action} at="action" site={site} tone="secondary" />
                    ) : null}
                  </Btns>
                </Card>
              </Panel>
            )}
          </div>
        </Inner>
      </Band>
    );
  }

  if (variant === "mapRight") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="grid grid-cols-1 items-center gap-[calc(var(--s-gap)*1.6)] lg:grid-cols-2">
            {words()}
            <Panel>
              <span
                aria-hidden
                className="grid size-16 place-items-center rounded-full bg-[var(--s-surface)]"
              >
                <MapPin className="size-8 text-[var(--s-primary)]" />
              </span>
              <p className={`m-0 ${BODY} text-center font-semibold text-[var(--s-ink)]`}>
                {site.name}
              </p>
              {lines.length > 0 ? (
                <p className={`m-0 ${BODY} text-center text-[var(--s-muted)]`}>
                  {lines.join(", ")}
                </p>
              ) : null}
            </Panel>
          </div>
        </Inner>
      </Band>
    );
  }

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner>
        <div className="flex flex-col gap-[calc(var(--s-gap)*1.2)]">
          {words()}
          {wantsPanel && !nothing ? (
            <Panel>
              <span
                aria-hidden
                className="grid size-14 place-items-center rounded-full bg-[var(--s-surface)]"
              >
                <Navigation className="size-7 text-[var(--s-primary)]" />
              </span>
              {lines.length > 0 ? (
                <p className={`m-0 ${BODY} text-center text-[var(--s-muted)]`}>
                  {lines.join(", ")}
                </p>
              ) : null}
            </Panel>
          ) : null}
        </div>
      </Inner>
    </Band>
  );
}

/**
 * The address itself.
 *
 * Editable only when the church wrote it here. The lines that come off its
 * record are changed in Settings, so the canvas is given nothing to click.
 */
function Address({
  lines,
  site,
  written,
}: {
  lines: string[];
  site: SectionViewProps["site"];
  written: boolean;
}) {
  const body = (
    <p className={`m-0 ${BODY} not-italic`}>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {index > 0 ? <br /> : null}
          {line}
        </React.Fragment>
      ))}
    </p>
  );
  if (written) {
    return (
      <address className="m-0">
        <T
          value={lines.join("\n")}
          as="span"
          at="address"
          site={site}
          className={`${BODY} block whitespace-pre-line`}
        />
      </address>
    );
  }
  if (lines.length === 0) return null;
  return <address className="m-0">{body}</address>;
}

/** The panel the map would have sat in, drawn in the church's own colours. */
function Panel({ children, tall }: { children: React.ReactNode; tall?: boolean }) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center gap-4 overflow-hidden"
        + " rounded-[var(--s-image-corner)] border border-[var(--s-line)]"
        + " bg-[var(--s-primary-soft)] p-6 sm:p-10 "
        + (tall ? "min-h-[380px] sm:items-start sm:justify-end" : "min-h-[280px]")
      }
    >
      {children}
    </div>
  );
}
