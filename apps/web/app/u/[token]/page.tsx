import { withdrawByToken } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { publicTab } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return publicTab(t("wayOut.title"));
}

/**
 * HRT-143, R16.8. The way out of a church's mailing.
 *
 * No session and no question. Somebody who followed this link has already
 * decided, and a screen that asks them to sign in first, or to confirm that
 * they really meant it, is a screen that gets the church reported as spam
 * instead.
 *
 * The token is the whole of the authorisation, which is why it is twenty-four
 * random bytes rather than a member id: this address is forwarded, pasted into
 * group chats and crawled, and a guessable one would let anybody take anybody
 * off a church's list.
 */
export default async function WayOutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const gone = await withdrawByToken(token);

  return (
    <main className="site-wash flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-[460px] flex-col gap-3 rounded-[20px] border border-line bg-surface p-8">
        <h1 className="m-0 font-display text-[24px] leading-8 text-fg">
          {gone ? t("wayOut.title") : t("wayOut.gone")}
        </h1>
        {gone ? (
          <p className="m-0 text-fg-muted">
            {t("wayOut.body", { church: gone.churchName })}
          </p>
        ) : null}
      </div>
    </main>
  );
}
