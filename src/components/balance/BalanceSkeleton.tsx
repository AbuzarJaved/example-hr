export function BalanceSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading balance"
      className="animate-pulse rounded-xl border border-zinc-100 bg-white p-5 shadow-sm"
    >
      <div className="h-4 w-28 rounded bg-zinc-200" />
      <div className="mt-4 space-y-2">
        <div className="h-8 w-16 rounded bg-zinc-200" />
        <div className="h-3 w-36 rounded bg-zinc-100" />
        <div className="h-3 w-28 rounded bg-zinc-100" />
      </div>
    </div>
  )
}
