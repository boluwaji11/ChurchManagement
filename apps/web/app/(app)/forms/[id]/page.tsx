import { generateMetadata } from "./page-content";
import { FormsUnder } from "../under";

export const dynamic = "force-dynamic";
export { generateMetadata };

/* R4.1, R24.6. The list, with this form's window standing over it. */
export default function FormRoutePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <FormsUnder searchParams={searchParams} />;
}
