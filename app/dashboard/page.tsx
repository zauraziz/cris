import { redirect } from "next/navigation";

// Analitika artıq admin tərəfindədir.
export default function DashboardRedirect() {
  redirect("/admin");
}
