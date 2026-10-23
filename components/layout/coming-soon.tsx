export function ComingSoon({
  title,
}: {
  title: string
}) {
  return (
    <section className="mx-auto w-full max-w-3xl py-12 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">
        This page is not available yet.
      </p>
    </section>
  )
}
