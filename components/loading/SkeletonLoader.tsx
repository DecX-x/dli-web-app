'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Base Skeleton Component
 * Requirements: 4.2
 * 
 * Displays a loading placeholder with shimmer animation
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

/**
 * Detection Feed Skeleton Loader
 * Requirements: 1.1
 */
export function DetectionFeedSkeleton() {
  return (
    <div className="relative w-full bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-3 w-32 mx-auto" />
        </div>
      </div>
      {/* FPS counter skeleton */}
      <div className="absolute top-4 right-4">
        <Skeleton className="h-7 w-20" />
      </div>
    </div>
  );
}

/**
 * Vehicle Counter Skeleton Loader
 * Requirements: 2.2, 2.3, 2.4
 */
export function VehicleCounterSkeleton() {
  return (
    <div className="space-y-4">
      {/* Total count skeleton */}
      <div className="bg-card border border-border rounded-lg p-4">
        <Skeleton className="h-6 w-24 mb-2" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Category counters skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Insight Panel Skeleton Loader
 * Requirements: 3.2
 */
export function InsightPanelSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-2 w-2 rounded-full mt-2" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Data Table Skeleton Loader
 * Requirements: 4.2
 */
export function DataTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card">
        {/* Table header */}
        <div className="border-b border-border p-4">
          <div className="flex gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="border-b border-border p-4 last:border-b-0">
            <div className="flex gap-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        ))}
      </div>
      {/* Pagination skeleton */}
      <div className="flex items-center justify-between px-2">
        <Skeleton className="h-5 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Session Detail Skeleton Loader
 * Requirements: 4.5
 */
export function SessionDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-muted rounded-lg p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>

      {/* Vehicle breakdown */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
