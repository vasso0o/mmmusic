// components/main-menu.tsx
import Link from "next/link"
import { auth } from "@/lib/auth"
import { LogoutButton } from "./logout-button"
import { connection } from "next/server"
import { ModeToggle } from "@/components/layout/mode-toggle"
import { AvatarEditorDialog } from "@/components/profile/AvatarEditorDialog"
import { prisma } from "@/lib/prisma"
import { getAvatarPresets } from "@/lib/avatar-presets"

export async function MainMenu() {
  await connection()
  const session = await auth()
  const isLoggedIn = !!session?.user
  const [currentUser, avatarPresets] = await Promise.all([
    session?.user?.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, image: true },
        })
      : null,
    getAvatarPresets(),
  ])

  return (
    <nav className="flex items-center gap-4 border-b px-4 py-3">
      <Link href="/" className="font-semibold">
        MeloDiss
      </Link>

      <div className="ml-auto flex items-center gap-4">
        <ModeToggle />
        {isLoggedIn ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {session.user?.email}
              </span>
              {currentUser && (
                <AvatarEditorDialog
                  name={currentUser.name}
                  image={currentUser.image}
                  presets={avatarPresets}
                />
              )}
            </div>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm hover:underline">
              Login
            </Link>
            <Link href="/register" className="text-sm hover:underline">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}