import { Suspense } from "react"
import Image from "next/image"
import LoginForm from "./login-form"
import HeroText from "./hero-text"

export default function LoginPage() {
  return (
    <main className="w-full lg:grid lg:grid-cols-[7fr_3fr]">
      <section className="login-hero-clip relative min-h-[52svh] overflow-hidden bg-purple-950 lg:min-h-[calc(100svh-57px)]">
        <Image
          src="/joyful-cats-with-sunglasses.jpg"
          alt=""
          fill
          preload
          quality={75}
          sizes="(min-width: 1024px) 70vw, 100vw"
          className="object-cover object-[50%_30%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-purple-700 via-purple-700/50 to-transparent"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 z-10 flex items-end p-6 sm:p-10">
          <HeroText />
        </div>
      </section>
      <section className="flex min-w-0 items-center justify-center p-4 pl-0 sm:p-8 sm:pl-8 lg:min-h-[calc(100svh-57px)]">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  )
}