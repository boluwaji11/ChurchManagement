/**
 * HRT-379. What every website section is handed.
 *
 * One signature, so the registry can hold them all in a table and the canvas
 * can draw any of them without knowing which it has.
 */
import type { SiteSection } from "@connectapp/db/rules";
import type { SiteCtx } from "./kit";

export interface SectionViewProps {
  section: SiteSection;
  site: SiteCtx;
}
