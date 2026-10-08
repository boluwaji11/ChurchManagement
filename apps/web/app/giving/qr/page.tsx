import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { withTenant, getChurch, getStripeAccount, canManageGiving } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { AutoPrint } from "@/app/checkin/rooms/print/auto-print";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says until the record names itself. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("giving.title"), church);
}

/**
 * R13.7. The code that goes on the bulletin and in the foyer.
 *
 * A sheet somebody prints, cuts and pins up. The address is printed under the
 * code as well, because a phone that will not scan is the common case and the
 * congregation should not be stuck for it.
 */
export default async function GivingQrPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  /*
   * A sheet with no shell around it, so the refusal panel has nowhere to
   * sit. Back to the screen this sheet was asked for from, which says why.
   */
  if (!canManageGiving(session)) redirect(`/settings/online?church=${session.tenantSlug}`);

  const read = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      profile: await getChurch(tx, session.tenantId),
      account: await getStripeAccount(tx),
    }),
  );

  if (!read.account?.chargesEnabled) redirect(`/settings/online?church=${session.tenantSlug}`);

  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "";
  const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const address = `${proto}://${host}/give/${session.tenantSlug}`;

  /*
   * Drawn as SVG rather than a picture, so it prints at whatever size the
   * paper is and stays scannable from across a foyer.
   */
  const svg = await QRCode.toString(address, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
  });

  return (
    <main className="mx-auto grid min-h-dvh max-w-2xl place-items-center bg-white px-6 py-10 text-black sm:px-10">
      <AutoPrint />
      <style>{"@page { size: auto; margin: 0; }"}</style>

      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="font-display text-[28px] leading-9 sm:text-[34px] sm:leading-[42px]">
          {t("give.title", { church: read.profile?.name ?? session.tenantName })}
        </h1>

        <div
          /* The sheet is paper, and it is read on a phone before it is
             printed. 320px plus the margins is wider than one. */
          className="w-[min(320px,100%)]"
          // The encoder returns a complete SVG document for the address above.
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <p className="m-0 font-mono text-[17px]">{address.replace(/^https?:\/\//, "")}</p>
      </div>
    </main>
  );
}
