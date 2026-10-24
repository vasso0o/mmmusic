"use server"

import { Platform, RoundPhase } from "@/lib/generated/prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

type RoundActionResult = { ok: true } | { ok: false; error: string }

function readOptionalText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key)
  if (typeof value !== "string") return { ok: true as const, value: null }
  const text = value.trim()
  if (!text) return { ok: true as const, value: null }
  if (text.length > maxLength) return { ok: false as const }
  return { ok: true as const, value: text }
}

export async function submitSong(
  leagueId: string,
  roundId: string,
  formData: FormData
): Promise<RoundActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to submit a song." }
  }

  const urlValue = formData.get("url")
  const platformValue = formData.get("platform")
  const platform =
    typeof platformValue === "string"
      ? Object.values(Platform).find((candidate) => candidate === platformValue)
      : undefined
  const urlString = typeof urlValue === "string" ? urlValue.trim() : ""
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return { ok: false, error: "Enter a valid song URL." }
  }
  if (
    urlString.length > 2048 ||
    (url.protocol !== "http:" && url.protocol !== "https:")
  ) {
    return { ok: false, error: "Enter a valid HTTP or HTTPS song URL." }
  }
  if (!platform) {
    return { ok: false, error: "Choose a supported music platform." }
  }

  const title = readOptionalText(formData, "title", 200)
  const artist = readOptionalText(formData, "artist", 200)
  const pitch = readOptionalText(formData, "pitch", 1000)
  if (!title.ok || !artist.ok || !pitch.ok) {
    return { ok: false, error: "Song details exceed the allowed length." }
  }

  const now = new Date()
  const round = await prisma.round.findFirst({
    where: {
      id: roundId,
      leagueId,
      phase: RoundPhase.SUBMISSION,
      submitDeadline: { gt: now },
      league: {
        archivedAt: null,
        members: {
          some: { userId: session.user.id, leftAt: null },
        },
      },
    },
    select: { id: true },
  })
  if (!round) {
    return {
      ok: false,
      error: "Submissions are closed, or you are not an active league member.",
    }
  }

  try {
    await prisma.submission.upsert({
      where: {
        roundId_userId: { roundId, userId: session.user.id },
      },
      create: {
        roundId,
        userId: session.user.id,
        url: url.toString(),
        platform,
        title: title.value,
        artist: artist.value,
        pitch: pitch.value,
      },
      update: {
        url: url.toString(),
        platform,
        title: title.value,
        artist: artist.value,
        pitch: pitch.value,
      },
    })
  } catch (error) {
    console.error("submitSong failed:", error)
    return { ok: false, error: "Failed to submit the song. Please try again." }
  }

  revalidatePath(`/leagues/${leagueId}/rounds/${roundId}`)
  revalidatePath(`/leagues/${leagueId}/rounds/${roundId}/submit`)
  return { ok: true }
}

export async function castVote(
  leagueId: string,
  roundId: string,
  submissionId: string,
  points: number,
  commentValue: string
): Promise<RoundActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to vote." }
  }

  if (!Number.isSafeInteger(points)) {
    return { ok: false, error: "Vote points must be a whole number." }
  }
  if (typeof commentValue !== "string") {
    return { ok: false, error: "Vote comment must be text." }
  }
  const comment = commentValue.trim()
  if (comment.length > 500) {
    return { ok: false, error: "Vote comments must be 500 characters or fewer." }
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        const now = new Date()
        const round = await transaction.round.findFirst({
          where: {
            id: roundId,
            leagueId,
            phase: RoundPhase.VOTING,
            voteDeadline: { gt: now },
            league: {
              archivedAt: null,
              members: {
                some: { userId: session.user.id, leftAt: null },
              },
            },
          },
          select: {
            id: true,
            league: {
              select: { pointBudget: true, allowDownvotes: true },
            },
          },
        })
        if (!round) {
          throw new Error("Voting is closed, or you are not an active league member.")
        }
        if (Math.abs(points) > round.league.pointBudget) {
          throw new Error(
            `A vote cannot exceed the ${round.league.pointBudget}-point budget.`
          )
        }
        if (points < 0 && !round.league.allowDownvotes) {
          throw new Error("Downvotes are not allowed in this league.")
        }

        const submission = await transaction.submission.findFirst({
          where: {
            id: submissionId,
            roundId,
            disqualified: false,
          },
          select: { userId: true },
        })
        if (!submission) throw new Error("Submission not found.")
        if (submission.userId === session.user.id) {
          throw new Error("You cannot vote for your own submission.")
        }

        const votes = await transaction.vote.findMany({
          where: { roundId, voterId: session.user.id },
          select: { submissionId: true, points: true },
        })
        const existingVote = votes.find(
          (vote) => vote.submissionId === submissionId
        )
        const spentExcludingThisVote = votes.reduce(
          (sum, vote) =>
            sum +
            (vote.submissionId === submissionId ? 0 : Math.abs(vote.points)),
          0
        )
        if (
          spentExcludingThisVote + Math.abs(points) >
          round.league.pointBudget
        ) {
          const remaining = round.league.pointBudget - spentExcludingThisVote
          throw new Error(`You have ${remaining} vote points remaining.`)
        }

        if (points === 0) {
          if (existingVote && !comment) {
            await transaction.vote.delete({
              where: {
                submissionId_voterId: {
                  submissionId,
                  voterId: session.user.id,
                },
              },
            })
          } else if (comment) {
            await transaction.vote.upsert({
              where: {
                submissionId_voterId: {
                  submissionId,
                  voterId: session.user.id,
                },
              },
              create: {
                roundId,
                submissionId,
                voterId: session.user.id,
                points: 0,
                comment,
              },
              update: { points: 0, comment },
            })
          }
          return
        }

        await transaction.vote.upsert({
          where: {
            submissionId_voterId: {
              submissionId,
              voterId: session.user.id,
            },
          },
          create: {
            roundId,
            submissionId,
            voterId: session.user.id,
            points,
            comment: comment || null,
          },
          update: { points, comment: comment || null },
        })
      },
      { isolationLevel: "Serializable" }
    )
  } catch (error) {
    if (error instanceof Error) {
      const knownErrors = [
        "Voting is closed",
        "A vote cannot exceed",
        "Downvotes are not allowed",
        "Submission not found",
        "You cannot vote",
        "You have ",
        "Vote comments must",
      ]
      if (knownErrors.some((message) => error.message.startsWith(message))) {
        return { ok: false, error: error.message }
      }
    }
    console.error("castVote failed:", error)
    return {
      ok: false,
      error: "Failed to cast your vote. Please try again.",
    }
  }

  revalidatePath(`/leagues/${leagueId}/rounds/${roundId}`)
  revalidatePath(`/leagues/${leagueId}/rounds/${roundId}/vote`)
  return { ok: true }
}
