export default function RecommendLoading() {
  return (
    <main className="page-shell py-8">
      <div className="mx-auto max-w-6xl">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton mt-3 h-4 w-96 max-w-full" />
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border border-[var(--color-border)] bg-white p-3">
              <div className="skeleton aspect-[1.5/1] w-full" />
              <div className="skeleton mt-4 h-5 w-3/4" />
              <div className="skeleton mt-3 h-16 w-full" />
              <div className="skeleton mt-4 h-10 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
