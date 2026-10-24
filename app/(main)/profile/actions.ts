"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAvatarPreset } from "@/lib/avatar-presets"

export type AvatarActionResult =
  | { ok: true; image: string }
  | { ok: false; error: string }

const MAX_AVATAR_BYTES = 128 * 1024

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
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image },
    })
  } catch (error) {
    console.error("updateUserAvatar failed:", error)
    return { ok: false, error: "Failed to save your avatar. Please try again." }
  }

  revalidatePath("/")
  revalidatePath("/profile")
  return { ok: true, image }
}
