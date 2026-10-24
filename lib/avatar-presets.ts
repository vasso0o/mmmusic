import { readdir } from "node:fs/promises"
import path from "node:path"

const AVATAR_DIRECTORY = path.join(process.cwd(), "public", "avatars")
const SUPPORTED_EXTENSIONS = new Set([
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".avif",
  ".bmp",
])

export type AvatarPreset = {
  id: string
  label: string
  src: string
}

export async function getAvatarPresets(): Promise<AvatarPreset[]> {
  const entries = await readdir(AVATAR_DIRECTORY, { withFileTypes: true })
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    )
    .map(({ name }) => {
      const extension = path.extname(name)
      const label = path.basename(name, extension).replace(/[_-]+/g, " ")
      return {
        id: name,
        label,
        src: `/avatars/${encodeURIComponent(name)}`,
      }
    })
    .sort((first, second) =>
      first.label.localeCompare(second.label, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    )
}

export async function getAvatarPreset(id: string) {
  if (path.basename(id) !== id) return undefined
  const presets = await getAvatarPresets()
  return presets.find((preset) => preset.id === id)
}
