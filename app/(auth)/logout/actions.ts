// app/(auth)/logout/actions.ts
"use server"

import { signOut } from "@/lib/auth"

export async function logoutUser() {
  // redirectTo tells NextAuth where to send the browser after clearing the cookie.
  await signOut({ redirectTo: "/login" })
}