import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * Base skeleton component for loading states
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded bg-muted', className)}
      {...props}
    />
  )
}

/**
 * Skeleton for table rows
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === 0 ? 'w-8' : i === columns - 1 ? 'w-20' : 'flex-1'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Skeleton for a data table
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  )
}

/**
 * Skeleton for stat cards grid
 */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={cn('grid gap-4', `grid-cols-${count}`)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded border border-border" />
      ))}
    </div>
  )
}

/**
 * Skeleton for a page header with title
 */
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-40" />
    </div>
  )
}

/**
 * Skeleton for a card with content
 */
export function CardSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <Skeleton className={cn('rounded border border-border', height)} />
  )
}

/**
 * Full page skeleton for consistent loading states
 */
export function PageSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      {children || (
        <>
          <StatCardsSkeleton />
          <CardSkeleton />
        </>
      )}
    </div>
  )
}
