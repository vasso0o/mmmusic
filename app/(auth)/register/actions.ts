// app/register/actions.ts
"use server"

import bcrypt from "bcryptjs"
import { z } from "zod"
import { AuthError } from "next-auth"
import { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { signIn } from "@/lib/auth"

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer"), // bcrypt hard limit
})

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string }

export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { name, email, password } = parsed.data

  // Reactivate soft-deleted accounts? No — treat the email as taken.
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { ok: false, error: "An account with this email already exists." }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    await prisma.user.create({
      data: { name, email, passwordHash },
    })
  } catch (err) {
    // P2002 = unique constraint violation (race condition on email)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "An account with this email already exists." }
    }
    console.error("registerUser failed:", err)
    return { ok: false, error: "Could not create your account. Please try again." }
  }

  // Auto sign-in. Server-side signIn from lib/auth.ts sets the session cookie.
  try {
    await signIn("credentials", { email, password, redirect: false })
  } catch (err) {
    if (err instanceof AuthError) {
      // Account was created but session couldn't be established.
      return {
        ok: false,
        error: "Account created, but sign-in failed. Please log in manually.",
      }
    }
    throw err // re-throw NEXT_REDIRECT and other framework errors
  }

  return { ok: true }
}