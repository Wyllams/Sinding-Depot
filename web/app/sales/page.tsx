import { redirect } from "next/navigation";

/**
 * Legacy /sales route — redirect to the new mobile sales dashboard.
 * This page is deprecated; all salesperson traffic now goes to /mobile/sales.
 */
export default function SalesRedirect() {
  redirect("/mobile/sales");
}
