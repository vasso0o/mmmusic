export const ROUND_PLATFORMS = ["YOUTUBE", "SOUNDCLOUD", "OTHER"] as const

export type RoundPlatform = (typeof ROUND_PLATFORMS)[number]

export const ROUND_PHASES = ["SUBMISSION", "VOTING", "REVEALED"] as const

export type RoundPhase = (typeof ROUND_PHASES)[number]
