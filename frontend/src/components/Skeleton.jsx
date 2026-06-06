/** Base pulse-animated placeholder block, sized via className. */
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-brand-100 ${className}`} />
}

/** Skeleton placeholder matching StatCard's layout (big number + label + icon chip). */
export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <Skeleton className="h-3 w-24 mt-4" />
    </div>
  )
}

/** Row of `count` StatCardSkeletons, matching the grid used across dashboard/report pages. */
export function StatCardSkeletonRow({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
  )
}

/** Skeleton placeholder for a data table: header bar + `rows` shimmer rows. */
export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="card overflow-hidden">
      <div className="table-header px-4 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-brand-50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className={`h-3.5 ${c === 0 ? 'w-1/4' : 'flex-1'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
