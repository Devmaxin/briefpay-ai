export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your dashboard…</span>

      <div className="border-b border-line pb-7">
        <div className="h-3 w-24 animate-pulse rounded bg-parchment-deep" />
        <div className="mt-3 h-9 w-72 max-w-full animate-pulse rounded bg-parchment-deep" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-parchment-deep" />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="bg-white px-5 py-5">
            <div className="h-3 w-20 animate-pulse rounded bg-parchment-deep" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-parchment-deep" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-parchment-deep" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="h-7 w-48 animate-pulse rounded bg-parchment-deep" />
        <div className="h-56 animate-pulse rounded-[var(--radius-card)] border border-line bg-white" />
      </div>
    </div>
  );
}
