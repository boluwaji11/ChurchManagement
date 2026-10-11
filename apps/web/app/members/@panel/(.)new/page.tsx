import { NewPersonPanelPage } from "../../new/page-content";

export default function InterceptedNewPersonPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return <NewPersonPanelPage searchParams={searchParams} />;
}
