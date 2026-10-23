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

function readOptionalHttpUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return { ok: true as const, value: null }

  try {
    const url = new URL(value.trim())
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false as const }
    }
    return { ok: true as const, value: url.toString() }
  } catch {
    return { ok: false as const }
  }
}

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
  const descriptionValue = formData.get("description")
  const imageValue = formData.get("image")
  const name = typeof nameValue === "string" ? nameValue.trim() : ""
  const password = typeof passwordValue === "string" ? passwordValue : ""
  const description =
    typeof descriptionValue === "string" ? descriptionValue.trim() : ""
  const image = readOptionalHttpUrl(imageValue)
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

  if (description.length > 2000) {
    return { ok: false, error: "Description must be 2000 characters or fewer." }
  }

  if (!image.ok) {
    return { ok: false, error: "Image must be a valid HTTP or HTTPS URL." }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    await prisma.$transaction(async (transaction) => {
      const league = await transaction.league.create({
        data: {
          name,
          description: description || null,
          image: image.value,
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

export async function leaveLeague(
  leagueId: string
): Promise<LeagueActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to leave a league." }
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { ownerId: true },
  })
  if (!league) {
    return { ok: false, error: "League not found." }
  }
  if (league.ownerId === session.user.id) {
    return { ok: false, error: "Owners cannot leave their own league." }
  }

  try {
    const result = await prisma.leagueMember.updateMany({
      where: {
        leagueId,
        userId: session.user.id,
        leftAt: null,
        role: "MEMBER",
      },
      data: { leftAt: new Date() },
    })

    if (result.count === 0) {
      return { ok: false, error: "You are not an active member of this league." }
    }
  } catch (error) {
    console.error("leaveLeague failed:", error)
    return { ok: false, error: "Failed to leave the league. Please try again." }
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
  const descriptionValue = formData.get("description")
  const imageValue = formData.get("image")
  const name = typeof nameValue === "string" ? nameValue.trim() : ""
  const description =
    typeof descriptionValue === "string" ? descriptionValue.trim() : ""
  const image = readOptionalHttpUrl(imageValue)
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

  if (description.length > 2000) {
    return { ok: false, error: "Description must be 2000 characters or fewer." }
  }

  if (!image.ok) {
    return { ok: false, error: "Image must be a valid HTTP or HTTPS URL." }
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
    description: description || null,
    image: image.value,
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

export async function createRound(
  leagueId: string,
  formData: FormData
): Promise<LeagueActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to create a round." }
  }

  const membership = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: session.user.id } },
    select: { leftAt: true },
  })
  if (!membership || membership.leftAt) {
    return { ok: false, error: "You must be an active member to create a round." }
  }

  const league = await prisma.league.findFirst({
    where: { id: leagueId, archivedAt: null },
    select: {
      id: true,
      maxRounds: true,
      _count: { select: { rounds: true } },
    },
  })
  if (!league) {
    return { ok: false, error: "League not found." }
  }
  if (league.maxRounds !== null && league._count.rounds >= league.maxRounds) {
    return { ok: false, error: "This league has reached its maximum number of rounds." }
  }

  const themeValue = formData.get("theme")
  const themeDescValue = formData.get("themeDesc")
  const submitDeadlineValue = formData.get("submitDeadline")
  const voteDeadlineValue = formData.get("voteDeadline")
  const theme = typeof themeValue === "string" ? themeValue.trim() : ""
  const themeDesc =
    typeof themeDescValue === "string" ? themeDescValue.trim() : ""
  const submitDeadline =
    typeof submitDeadlineValue === "string" && submitDeadlineValue
      ? new Date(submitDeadlineValue)
      : null
  const voteDeadline =
    typeof voteDeadlineValue === "string" && voteDeadlineValue
      ? new Date(voteDeadlineValue)
      : null

  if (theme.length < 3 || theme.length > 100) {
    return { ok: false, error: "Theme must be between 3 and 100 characters." }
  }
  if (themeDesc.length > 1000) {
    return { ok: false, error: "Description must be 1000 characters or fewer." }
  }
  if (
    !submitDeadline ||
    !voteDeadline ||
    Number.isNaN(submitDeadline.getTime()) ||
    Number.isNaN(voteDeadline.getTime())
  ) {
    return { ok: false, error: "Enter valid submission and voting deadlines." }
  }
  if (submitDeadline <= new Date()) {
    return { ok: false, error: "Submission deadline must be in the future." }
  }
  if (voteDeadline <= submitDeadline) {
    return { ok: false, error: "Voting deadline must be after submissions close." }
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const highestRound = await transaction.round.findFirst({
        where: { leagueId },
        orderBy: { roundNumber: "desc" },
        select: { roundNumber: true },
      })

      await transaction.round.create({
        data: {
          leagueId,
          createdById: session.user.id,
          roundNumber: (highestRound?.roundNumber ?? 0) + 1,
          theme,
          themeDesc: themeDesc || null,
          submitDeadline,
          voteDeadline,
        },
      })
    })
  } catch (error) {
    console.error("createRound failed:", error)
    return { ok: false, error: "Failed to create the round. Please try again." }
  }

  revalidatePath(`/leagues/${leagueId}`)
  return { ok: true }
}

export async function deleteRound(roundId: string): Promise<LeagueActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to delete a round." }
  }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { league: { select: { id: true, ownerId: true } } },
  })
  if (!round) {
    return { ok: false, error: "Round not found." }
  }

  if (
    round.createdById !== session.user.id &&
    round.league.ownerId !== session.user.id
  ) {
    return { ok: false, error: "You do not have permission to delete this round." }
  }

  try {
    await prisma.round.delete({ where: { id: roundId } })
  } catch (error) {
    console.error("deleteRound failed:", error)
    return { ok: false, error: "Failed to delete the round. Please try again." }
  }

  revalidatePath(`/leagues/${round.league.id}`)
  return { ok: true }
}

export async function moveRound(
  roundId: string,
  direction: "up" | "down"
): Promise<LeagueActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to reorder rounds." }
  }
  if (direction !== "up" && direction !== "down") {
    return { ok: false, error: "Invalid round direction." }
  }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { league: { select: { id: true, ownerId: true } } },
  })
  if (!round) {
    return { ok: false, error: "Round not found." }
  }
  if (round.league.ownerId !== session.user.id) {
    return { ok: false, error: "Only the league owner can reorder rounds." }
  }

  try {
    const moved = await prisma.$transaction(async (transaction) => {
      const orderedRounds = await transaction.round.findMany({
        where: { leagueId: round.leagueId },
        orderBy: { roundNumber: "asc" },
        select: { id: true, roundNumber: true },
      })
      const currentIndex = orderedRounds.findIndex((item) => item.id === round.id)
      const targetIndex = currentIndex + (direction === "up" ? -1 : 1)
      const targetRound = orderedRounds[targetIndex]
      if (!targetRound) return false

      const lowestRound = await transaction.round.findFirst({
        where: { leagueId: round.leagueId },
        orderBy: { roundNumber: "asc" },
        select: { roundNumber: true },
      })
      const temporaryNumber = Math.min(0, (lowestRound?.roundNumber ?? 0) - 1)
      const currentRound = orderedRounds[currentIndex]

      await transaction.round.update({
        where: { id: round.id },
        data: { roundNumber: temporaryNumber },
      })
      await transaction.round.update({
        where: { id: targetRound.id },
        data: { roundNumber: currentRound.roundNumber },
      })
      await transaction.round.update({
        where: { id: round.id },
        data: { roundNumber: targetRound.roundNumber },
      })

      return true
    })

    if (!moved) {
      return { ok: false, error: "Cannot move the round further in that direction." }
    }
  } catch (error) {
    console.error("moveRound failed:", error)
    return { ok: false, error: "Failed to reorder the round. Please try again." }
  }

  revalidatePath(`/leagues/${round.league.id}`)
  return { ok: true }
}
