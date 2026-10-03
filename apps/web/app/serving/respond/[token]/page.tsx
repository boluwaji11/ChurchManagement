import { servingRequestFor } from "@hearth/db";
import { EmptyState } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { Logo } from "@/components/brand";
import { dayAndMonth, readableTime } from "@/lib/dates";
import { Respond } from "./respond";

export const dynamic = "force-dynamic";

/**
 * R10.6. The screen a volunteer answers on.
 *
 * No sign-in, no header, no church navigation. Somebody opening this came from
 * a message asking whether they can serve, and the only thing on the page is
 * that question.
 */
export default async function RespondPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const request = await servingRequestFor(token);

  return (
    <main id="main" className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-12 sm:px-6">
      <Logo href="/" />

      {!request ? (
        <EmptyState title={t("respond.gone.title")} />
      ) : request.past ? (
        <EmptyState title={t("respond.past.title")} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <PageTitle
              title={t("respond.title", {
                team: request.teamName,
                position: request.positionName,
              })}
              className="mb-0"
            />
            <p className="text-body-lg text-fg-muted">
              {request.churchName}
            </p>
            <p className="text-body-lg text-fg">
              {dayAndMonth(request.occursOn)} {readableTime(request.startsAt)}
              {" "}
              <span className="text-fg-muted">{request.serviceName}</span>
            </p>
          </div>

          <Respond token={token} request={request} />
        </>
      )}
    </main>
  );
}
