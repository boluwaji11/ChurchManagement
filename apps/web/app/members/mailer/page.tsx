import MailerPage, { generateMetadata } from "./page-content";

export const dynamic = "force-dynamic";
export { generateMetadata };

export default function MailerRoutePage(props: {
  searchParams: Promise<{ open?: string; archived?: string }>;
}) {
  return <MailerPage {...props} />;
}
