// app/(main)/layout.tsx
export default function MainGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="container mx-auto flex-1 p-4">
      {children}
    </main>
  )
}