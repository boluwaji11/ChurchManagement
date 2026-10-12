import { MailerPanelPage } from "../../mailer/page-content";

export default function InterceptedMailerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return <MailerPanelPage searchParams={searchParams} />;
}
