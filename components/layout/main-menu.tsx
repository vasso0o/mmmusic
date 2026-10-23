// components/main-menu.tsx
import Link from "next/link"
import { auth } from "@/lib/auth"
import { LogoutButton } from "./logout-button"
import { connection } from "next/server"
export async function MainMenu() {
  await connection();
  const session = await auth()
  const isLoggedIn = !!session?.user

  return (
    <nav className="flex items-center gap-4 border-b px-4 py-3">
      <Link href="/" className="font-semibold">
        MMMusic
      </Link>

      <div className="ml-auto flex items-center gap-4">
        {isLoggedIn ? (
          <>
            <Link href="/" className="text-sm hover:underline">
              Home
            </Link>
            <span className="text-sm text-muted-foreground">
              {session.user?.email}
            </span>
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