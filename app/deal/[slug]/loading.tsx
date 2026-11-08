import React from 'react'
import { ShoppingBag } from 'lucide-react'

export default function LoadingDeal() {
  return (
    <div className="min-h-screen w-full bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Ticker Skeleton */}
      <div className="h-9 w-full bg-slate-900 border-b border-slate-800 animate-pulse" />

      {/* Header Skeleton */}
      <div className="h-16 w-full bg-slate-900/60 border-b border-slate-800 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3 w-32 bg-slate-800 rounded animate-pulse" />
            <div className="h-2 w-20 bg-slate-800/80 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-24 bg-slate-800 rounded-xl animate-pulse" />
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-4xl w-full mx-auto p-6 sm:p-8 space-y-8 flex-1">
        {/* Hero Card Skeleton */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-6 w-36 bg-slate-800 rounded-full animate-pulse" />
            <div className="h-4 w-28 bg-slate-800 rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="aspect-square w-full rounded-2xl bg-slate-800/60 border border-slate-800 animate-pulse flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-slate-700 animate-bounce" />
            </div>

            <div className="space-y-4">
              <div className="h-8 w-3/4 bg-slate-800 rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-3.5 w-full bg-slate-800/80 rounded animate-pulse" />
                <div className="h-3.5 w-5/6 bg-slate-800/80 rounded animate-pulse" />
              </div>
              <div className="h-20 w-full rounded-2xl bg-slate-950/80 border border-slate-800 animate-pulse" />
              <div className="h-14 w-full rounded-2xl bg-emerald-900/30 border border-emerald-500/20 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Feature Badges Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
