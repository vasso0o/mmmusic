"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type CreateLeagueResult =
  | { ok: true }
  | { ok: false; error: string }

export type LeagueActionResult =
  | { ok: true }
  | { ok: false; error: string }

export async function createLeague(
  formData: FormData
): Promise<CreateLeagueResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to create a league." }
  }

  const nameValue = formData.get("name")
  const passwordValue = formData.get("password")
  const pointBudgetValue = formData.get("pointBudget")
  const name = typeof nameValue === "string" ? nameValue.trim() : ""
  const password = typeof passwordValue === "string" ? passwordValue : ""
  const pointBudget =
    typeof pointBudgetValue === "string" && pointBudgetValue.trim()
      ? Number(pointBudgetValue)
      : 10
  const allowDownvotes = formData.get("allowDownvotes") === "on"

  if (name.length < 3 || name.length > 50) {
    return {
      ok: false,
      error: "League name must be between 3 and 50 characters.",
    }
  }

  if (password.length < 4 || password.length > 72) {
    return {
      ok: false,
      error: "Join password must be between 4 and 72 characters.",
    }
  }

  if (!Number.isInteger(pointBudget) || pointBudget < 1) {
    return { ok: false, error: "Point budget must be a positive whole number." }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    await prisma.$transaction(async (transaction) => {
      const league = await transaction.league.create({
        data: {
          name,
          passwordHash,
          pointBudget,
          allowDownvotes,
          ownerId: session.user.id,
        },
      })

      await transaction.leagueMember.create({
        data: {
          leagueId: league.id,
          userId: session.user.id,
          role: "OWNER",
        },
      })
    })
  } catch (error) {
    console.error("createLeague failed:", error)
    return {
      ok: false,
      error: "Could not create the league. Please try again.",
    }
  }

  revalidatePath("/")
  return { ok: true }
}

export async function joinLeague(
  leagueId: string,
  formData: FormData
): Promise<LeagueActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to join." }
  }

  const passwordValue = formData.get("password")
  const password = typeof passwordValue === "string" ? passwordValue : ""
  if (!password) {
    return { ok: false, error: "Password is required." }
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { passwordHash: true, archivedAt: true },
  })
  if (!league || league.archivedAt) {
    return { ok: false, error: "League not found." }
  }

  const isValidPassword = await bcrypt.compare(password, league.passwordHash)
  if (!isValidPassword) {
    return { ok: false, error: "Incorrect league password." }
  }

  try {
    await prisma.leagueMember.upsert({
      where: {
        leagueId_userId: { leagueId, userId: session.user.id },
      },
      create: {
        leagueId,
        userId: session.user.id,
        role: "MEMBER",
      },
      update: { leftAt: null },
    })
  } catch (error) {
    console.error("joinLeague failed:", error)
    return { ok: false, error: "Failed to join the league. Please try again." }
  }

  revalidatePath(`/leagues/${leagueId}`)
  revalidatePath("/")
  return { ok: true }
}

export async function updateLeague(
  leagueId: string,
  formData: FormData
): Promise<LeagueActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to edit this league." }
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { ownerId: true, archivedAt: true },
  })
  if (!league || league.archivedAt || league.ownerId !== session.user.id) {
    return {
      ok: false,
      error: "You do not have permission to edit this league.",
    }
  }

  const nameValue = formData.get("name")
  const pointBudgetValue = formData.get("pointBudget")
  const maxRoundsValue = formData.get("maxRounds")
  const passwordValue = formData.get("password")
  const name = typeof nameValue === "string" ? nameValue.trim() : ""
  const pointBudget =
    typeof pointBudgetValue === "string" && pointBudgetValue.trim()
      ? Number(pointBudgetValue)
      : Number.NaN
  const maxRoundsText =
    typeof maxRoundsValue === "string" ? maxRoundsValue.trim() : ""
  const maxRounds = maxRoundsText ? Number(maxRoundsText) : null
  const newPassword =
    typeof passwordValue === "string" ? passwordValue : ""
  const allowDownvotes = formData.get("allowDownvotes") === "on"

  if (name.length < 3 || name.length > 50) {
    return {
      ok: false,
      error: "League name must be between 3 and 50 characters.",
    }
  }

  if (!Number.isInteger(pointBudget) || pointBudget < 1) {
    return { ok: false, error: "Point budget must be a positive whole number." }
  }

  if (
    maxRounds !== null &&
    (!Number.isInteger(maxRounds) || maxRounds < 1)
  ) {
    return {
      ok: false,
      error: "Maximum rounds must be a positive whole number.",
    }
  }

  if (newPassword && (newPassword.trim().length < 4 || newPassword.length > 72)) {
    return {
      ok: false,
      error: "New password must be between 4 and 72 characters.",
    }
  }

  const data = {
    name,
    pointBudget,
    allowDownvotes,
    maxRounds,
    ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 12) } : {}),
  }

  try {
    await prisma.league.update({
      where: { id: leagueId },
      data,
    })
  } catch (error) {
    console.error("updateLeague failed:", error)
    return { ok: false, error: "Failed to update the league. Please try again." }
  }

  revalidatePath(`/leagues/${leagueId}`)
  revalidatePath("/")
  return { ok: true }
}
