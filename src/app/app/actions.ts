"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ORG_COOKIE } from "@/lib/data/current-org";

export async function switchOrganizationAction(formData: FormData) {
  const organizationId = formData.get("organizationId");
  if (typeof organizationId === "string" && organizationId) {
    const cookieStore = await cookies();
    cookieStore.set(ORG_COOKIE, organizationId, { httpOnly: true, sameSite: "lax", path: "/" });
  }
  redirect("/app/dashboard");
}
