import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()

  if (!query) {
    return NextResponse.json([])
  }

  const leagues = await prisma.league.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      owner: { select: { name: true } },
    },
    take: 10,
  })

  return NextResponse.json(leagues)
}