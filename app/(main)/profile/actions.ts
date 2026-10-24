"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAvatarPreset } from "@/lib/avatar-presets"

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; error: string }

export type AvatarActionResult =
  | { ok: true; image: string }
  | { ok: false; error: string }

const MAX_AVATAR_BYTES = 128 * 1024
const userNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(80, "Name must be 80 characters or fewer.")

export async function updateUserName(
  value: unknown
): Promise<ProfileActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to update your name." }
  }

  const parsed = userNameSchema.safeParse(value)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a valid name.",
    }
  }

  try {
    const result = await prisma.user.updateMany({
      where: { id: session.user.id, deletedAt: null },
      data: { name: parsed.data },
    })
    if (result.count === 0) {
      return { ok: false, error: "Your account is no longer available." }
    }
  } catch (error) {
    console.error("updateUserName failed:", error)
    return { ok: false, error: "Failed to update your name. Please try again." }
  }

  revalidatePath("/")
  revalidatePath("/profile")
  return { ok: true }
}

export async function deleteUserAccount(): Promise<ProfileActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to delete your account." }
  }

  const deletedAt = new Date()
  let deletion: string[] | null
  try {
    deletion = await prisma.$transaction(async (transaction) => {
      const ownedLeagues = await transaction.league.findMany({
        where: { ownerId: session.user.id, archivedAt: null },
        select: { id: true },
      })
      const result = await transaction.user.updateMany({
        where: { id: session.user.id, deletedAt: null },
        data: { deletedAt },
      })
      if (result.count === 0) return null

      await transaction.league.updateMany({
        where: { ownerId: session.user.id, archivedAt: null },
        data: { archivedAt: deletedAt },
      })
      await transaction.leagueMember.updateMany({
        where: { userId: session.user.id, leftAt: null },
        data: { leftAt: deletedAt },
      })

      return ownedLeagues.map((league) => league.id)
    })
  } catch (error) {
    console.error("deleteUserAccount failed:", error)
    return { ok: false, error: "Failed to delete your account. Please try again." }
  }

  if (!deletion) {
    return { ok: false, error: "Your account has already been deleted." }
  }

  const ownedLeagueIds = deletion
  for (const leagueId of ownedLeagueIds) {
    revalidatePath(`/leagues/${leagueId}`)
  }
  revalidatePath("/")
  revalidatePath("/leagues")
  revalidatePath("/profile")

  await signOut({ redirectTo: "/login?accountDeleted=1" })
  return { ok: true }
}

export async function updateUserAvatar(
  formData: FormData
): Promise<AvatarActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "You must be logged in to update your avatar." }
  }

  const presetId = formData.get("preset")
  const preset =
    typeof presetId === "string" ? await getAvatarPreset(presetId) : undefined

  let image: string
  if (preset) {
    image = preset.src
  } else {
    const avatar = formData.get("avatar")
    if (!(avatar instanceof File) || avatar.size === 0) {
      return { ok: false, error: "Choose an avatar image or preset." }
    }
    if (avatar.type !== "image/jpeg" || avatar.size > MAX_AVATAR_BYTES) {
      return {
        ok: false,
        error: "Cropped avatar must be a JPEG smaller than 128 KB.",
      }
    }

    const bytes = new Uint8Array(await avatar.arrayBuffer())
    if (
      bytes.length < 3 ||
      bytes[0] !== 0xff ||
      bytes[1] !== 0xd8 ||
      bytes[2] !== 0xff
    ) {
      return { ok: false, error: "The uploaded avatar is not a valid JPEG." }
    }

    image = `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`
  }

  try {
    const result = await prisma.user.updateMany({
      where: { id: session.user.id, deletedAt: null },
      data: { image },
    })
    if (result.count === 0) {
      return { ok: false, error: "Your account is no longer available." }
    }
  } catch (error) {
    console.error("updateUserAvatar failed:", error)
    return { ok: false, error: "Failed to save your avatar. Please try again." }
  }

  revalidatePath("/")
  revalidatePath("/profile")
  return { ok: true, image }
}
