export default function AdminDashboardLoading() {
  return (
    <div className="min-h-screen bg-[#030712] font-sans pb-16 animate-pulse text-slate-100">
      {/* Header Skeleton */}
      <header className="border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-900/50" />
          <div className="h-4 w-44 bg-slate-800 rounded-md" />
        </div>
        <div className="h-4 w-32 bg-slate-800 rounded-md" />
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        {/* Banner Skeleton */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 space-y-4">
          <div className="h-4 w-36 bg-indigo-500/20 rounded-full" />
          <div className="h-7 w-72 bg-slate-800 rounded-md" />
          <div className="h-4 w-full max-w-xl bg-slate-800/60 rounded-md" />
        </div>

        {/* KPI Cards Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 bg-slate-800 rounded-md" />
                <div className="w-5 h-5 bg-slate-800 rounded-md" />
              </div>
              <div className="h-8 w-24 bg-slate-700 rounded-md" />
              <div className="h-3 w-36 bg-slate-800/50 rounded-md" />
            </div>
          ))}
        </div>

        {/* Security / RLS Card Skeleton */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="h-5 w-52 bg-slate-800 rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-20 bg-slate-950/60 rounded-2xl border border-slate-800" />
            <div className="h-20 bg-slate-950/60 rounded-2xl border border-slate-800" />
          </div>
        </div>
      </main>
    </div>
  );
}
