export default function ClientDashboardLoading() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-16 animate-pulse">
      {/* Header skeleton */}
      <header className="bg-white/80 border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100" />
            <div className="h-5 w-24 bg-slate-200 rounded-md" />
          </div>
          <div className="h-8 w-32 bg-slate-200 rounded-xl" />
        </div>
      </header>

      {/* Main container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* Profile Card Skeleton */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-slate-200 rounded-md" />
              <div className="h-4 w-56 bg-slate-100 rounded-md" />
            </div>
          </div>
          <div className="h-14 w-36 bg-slate-100 rounded-2xl" />
        </div>

        {/* Toolbar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-slate-200 rounded-md" />
            <div className="h-3 w-64 bg-slate-100 rounded-md" />
          </div>
          <div className="h-10 w-full sm:w-72 bg-white rounded-xl border border-slate-200" />
        </div>

        {/* Product Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-16 bg-blue-50 rounded-full" />
                <div className="h-4 w-20 bg-slate-100 rounded-md" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full bg-slate-200 rounded-md" />
                <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
              </div>
              <div className="h-3 w-28 bg-slate-100 rounded-md" />
              <div className="h-10 w-full bg-blue-50 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
