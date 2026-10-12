import DuplicatesPage, { generateMetadata } from "./page-content";

export const dynamic = "force-dynamic";
export { generateMetadata };

export default function DuplicatesRoutePage(props: {
  searchParams: Promise<{ a?: string; b?: string; page?: string; past?: string }>;
}) {
  return <DuplicatesPage {...props} />;
}
