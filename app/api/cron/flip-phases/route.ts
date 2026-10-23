export async function GET() {
  return Response.json(
    { error: "Phase-flipping cron job is not implemented yet." },
    { status: 501 }
  )
}