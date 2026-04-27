import React from "react";

/**
 * Legacy /sales layout — passthrough only.
 * The page.tsx handles the redirect to /mobile/sales.
 * Sub-routes (/sales/jobs, /sales/profile) still use this layout if needed.
 */
export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
