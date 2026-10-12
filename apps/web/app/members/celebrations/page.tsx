import CelebrationsPage, { generateMetadata } from "./page-content";

export const dynamic = "force-dynamic";
export { generateMetadata };

export default function CelebrationsRoutePage(props: {
  searchParams: Promise<{ church?: string; view?: string; at?: string }>;
}) {
  return <CelebrationsPage {...props} />;
}
