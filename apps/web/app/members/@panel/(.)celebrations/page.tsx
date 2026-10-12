import { CelebrationsPanelPage } from "../../celebrations/page-content";

export default function InterceptedCelebrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return <CelebrationsPanelPage searchParams={searchParams} />;
}
