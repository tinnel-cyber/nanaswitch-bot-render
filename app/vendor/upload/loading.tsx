export default function VendorUploadLoading() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-16 animate-pulse">
      {/* Blue Header Banner Skeleton */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-white/30 rounded-md" />
              <div className="h-3 w-64 bg-white/20 rounded-md" />
            </div>
          </div>
          <div className="h-9 w-36 bg-white/20 rounded-xl" />
        </div>
      </header>

      {/* Main Form Skeleton */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        {/* Tab Selector Skeleton */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 flex gap-2">
          <div className="h-11 flex-1 bg-blue-100 rounded-xl" />
          <div className="h-11 flex-1 bg-slate-100 rounded-xl" />
          <div className="h-11 flex-1 bg-slate-100 rounded-xl" />
        </div>

        {/* Form Container Skeleton */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-5 space-y-2">
            <div className="h-5 w-56 bg-slate-200 rounded-md" />
            <div className="h-3 w-80 bg-slate-100 rounded-md" />
          </div>

          <div className="space-y-2">
            <div className="h-3 w-32 bg-slate-200 rounded-md" />
            <div className="h-11 w-full bg-slate-50 rounded-xl border border-slate-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-3 w-28 bg-slate-200 rounded-md" />
              <div className="h-11 w-full bg-slate-50 rounded-xl border border-slate-200" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-28 bg-slate-200 rounded-md" />
              <div className="h-11 w-full bg-slate-50 rounded-xl border border-slate-200" />
            </div>
          </div>

          {/* Dropzone Skeleton */}
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center space-y-3 bg-slate-50">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl" />
            <div className="h-4 w-60 bg-slate-200 rounded-md" />
            <div className="h-3 w-72 bg-slate-100 rounded-md" />
          </div>

          {/* Submit Button Skeleton */}
          <div className="h-12 w-full bg-blue-600/40 rounded-xl" />
        </div>
      </main>
    </div>
  );
}
