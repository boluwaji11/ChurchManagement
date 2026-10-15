import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * HRT-288, R22.2. The domain reading moved in with the sending.
 *
 * Reading what a church's domain is set up with and fixing what its sending
 * needs are the same job, and they were two names in the menu. The address is
 * kept because it has been handed out, and it lands where the reading now is.
 */
export default function DomainPage() {
  redirect("/settings/email");
}
