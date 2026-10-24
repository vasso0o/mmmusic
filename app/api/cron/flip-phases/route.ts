import { timingSafeEqual } from "node:crypto"
import { processRoundPhases } from "@/lib/rounds"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json(
      { error: "Cron authorization is not configured." },
      { status: 503 }
    )
  }

  const authorization = request.headers.get("authorization") ?? ""
  const providedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : ""
  const expected = Buffer.from(secret)
  const provided = Buffer.from(providedSecret)
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return Response.json({ error: "Unauthorized." }, { status: 401 })
  }

  const transitions = await processRoundPhases()
  return Response.json({ success: true, ...transitions })
}