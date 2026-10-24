export const ROUND_PLATFORMS = ["YOUTUBE", "SOUNDCLOUD", "OTHER"] as const

export type RoundPlatform = (typeof ROUND_PLATFORMS)[number]
