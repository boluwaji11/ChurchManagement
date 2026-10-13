import ImportPage, { generateMetadata } from "./page-content";

export const dynamic = "force-dynamic";
export { generateMetadata };

export default function ImportRoutePage(props: {
  searchParams: Promise<Record<string, string>>;
}) {
  return <ImportPage {...props} />;
}
