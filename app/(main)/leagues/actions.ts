"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export type CreateLeagueResult =
  | { ok: true }
  | { ok: false; error: string }

export type LeagueActionResult =
  | { ok: true }
  | { ok: false; error: string }

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

async function recalculateTimeline(
  transaction: Prisma.TransactionClient,
  leagueId: string
) {
  const rounds = await transaction.round.findMany({
    where: { leagueId },
    orderBy: { roundNumber: "asc" },
  })
  if (rounds.length === 0) return

  let currentStart = rounds[0].startsAt
  for (const round of rounds) {
    const submitDeadline = new Date(
      currentStart.getTime() + round.submitDays * DAY_IN_MILLISECONDS
    )
    const voteDeadline = new Date(
      submitDeadline.getTime() + round.voteDays * DAY_IN_MILLISECONDS
    )

    await transaction.round.update({
      where: { id: round.id },
      data: { startsAt: currentStart, submitDeadline, voteDeadline },
    })
    currentStart = voteDeadline
  }
}

const MAX_LEAGUE_IMAGE_BYTES = 800 * 1024

async function readOptionalLeagueImage(value: FormDataEntryValue | null) {
  if (value === null) return { ok: true as const, value: null }
  if (!(value instanceof File)) {
    return { ok: false as const, error: "Upload a cropped JPEG image." }
  }
  if (value.size === 0) return { ok: true as const, value: null }
  if (value.type !== "image/jpeg" || value.size > MAX_LEAGUE_IMAGE_BYTES) {
    return {
      ok: false as const,
      error: "Cropped league image must be a JPEG smaller than 800 KB.",
    }
  }

  const bytes = new Uint8Array(await value.arrayBuffer())
  if (
    bytes.length < 3 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[2] !== 0xff
  ) {
    return {
      ok: false as const,
      error: "The uploaded image is not a valid JPEG.",
    }
  }

  return {
    ok: true as const,
    value: `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`,
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
  const name = typeof nameValue === "string" ? nameValue.trim() : ""
  const password = typeof passwordValue === "string" ? passwordValue : ""
  const description =
    typeof descriptionValue === "string" ? descriptionValue.trim() : ""
  const image = await readOptionalLeagueImage(formData.get("image"))
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
    return { ok: false, error: image.error }
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

export async function removeLeagueMember(
  leagueId: string,
  userId: string
): Promise<LeagueActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to remove a member." }
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { ownerId: true },
  })
  if (!league) {
    return { ok: false, error: "League not found." }
  }
  if (league.ownerId !== session.user.id) {
    return { ok: false, error: "Only the league owner can remove members." }
  }
  if (userId === league.ownerId) {
    return { ok: false, error: "The league owner cannot be removed." }
  }

  try {
    const result = await prisma.leagueMember.updateMany({
      where: {
        leagueId,
        userId,
        leftAt: null,
        role: "MEMBER",
      },
      data: { leftAt: new Date() },
    })

    if (result.count === 0) {
      return { ok: false, error: "This user is not an active league member." }
    }
  } catch (error) {
    console.error("removeLeagueMember failed:", error)
    return {
      ok: false,
      error: "Failed to remove the member. Please try again.",
    }
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
    select: { ownerId: true, archivedAt: true, image: true },
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
  const name = typeof nameValue === "string" ? nameValue.trim() : ""
  const description =
    typeof descriptionValue === "string" ? descriptionValue.trim() : ""
  const image = await readOptionalLeagueImage(formData.get("image"))
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
    return { ok: false, error: image.error }
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
    image:
      image.value ??
      (formData.get("removeImage") === "on" ? null : league.image),
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
  const submitDaysValue = formData.get("submitDays")
  const voteDaysValue = formData.get("voteDays")
  const theme = typeof themeValue === "string" ? themeValue.trim() : ""
  const themeDesc =
    typeof themeDescValue === "string" ? themeDescValue.trim() : ""
  const submitDays =
    typeof submitDaysValue === "string" ? Number(submitDaysValue) : Number.NaN
  const voteDays =
    typeof voteDaysValue === "string" ? Number(voteDaysValue) : Number.NaN

  if (theme.length < 3 || theme.length > 100) {
    return { ok: false, error: "Theme must be between 3 and 100 characters." }
  }
  if (themeDesc.length > 1000) {
    return { ok: false, error: "Description must be 1000 characters or fewer." }
  }
  if (!Number.isInteger(submitDays) || submitDays < 1 || submitDays > 365) {
    return {
      ok: false,
      error: "Submission phase must be between 1 and 365 days.",
    }
  }
  if (!Number.isInteger(voteDays) || voteDays < 1 || voteDays > 365) {
    return { ok: false, error: "Voting phase must be between 1 and 365 days." }
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const highestRound = await transaction.round.findFirst({
        where: { leagueId },
        orderBy: { roundNumber: "desc" },
        select: { roundNumber: true, voteDeadline: true },
      })
      const startsAt = highestRound?.voteDeadline ?? new Date()
      const submitDeadline = new Date(
        startsAt.getTime() + submitDays * DAY_IN_MILLISECONDS
      )
      const voteDeadline = new Date(
        submitDeadline.getTime() + voteDays * DAY_IN_MILLISECONDS
      )

      await transaction.round.create({
        data: {
          leagueId,
          createdById: session.user.id,
          roundNumber: (highestRound?.roundNumber ?? 0) + 1,
          theme,
          themeDesc: themeDesc || null,
          startsAt,
          submitDays,
          voteDays,
          submitDeadline,
          voteDeadline,
        },
      })
      await recalculateTimeline(transaction, leagueId)
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
    await prisma.$transaction(async (transaction) => {
      await transaction.round.delete({ where: { id: roundId } })

      const remainingRounds = await transaction.round.findMany({
        where: { leagueId: round.league.id },
        orderBy: { roundNumber: "asc" },
        select: { id: true },
      })
      for (let index = 0; index < remainingRounds.length; index += 1) {
        await transaction.round.update({
          where: { id: remainingRounds[index].id },
          data: { roundNumber: -(index + 1) },
        })
      }
      for (let index = 0; index < remainingRounds.length; index += 1) {
        await transaction.round.update({
          where: { id: remainingRounds[index].id },
          data: { roundNumber: index + 1 },
        })
      }

      await recalculateTimeline(transaction, round.league.id)
    })
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
      await recalculateTimeline(transaction, round.league.id)

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
