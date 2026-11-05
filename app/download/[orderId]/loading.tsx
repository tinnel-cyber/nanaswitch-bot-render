export default function DownloadOrderIdLoading() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-md w-full shadow-lg text-center animate-pulse space-y-4">
        {/* Circle Icon Skeleton */}
        <div className="w-16 h-16 bg-blue-50 rounded-2xl mx-auto flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>

        <div className="h-3 w-28 bg-blue-50 rounded-full mx-auto" />
        <div className="h-5 w-56 bg-slate-200 rounded-md mx-auto" />
        <div className="h-3 w-64 bg-slate-100 rounded-md mx-auto" />

        <div className="pt-4 space-y-2">
          <div className="h-11 w-full bg-blue-100 rounded-xl" />
          <div className="h-9 w-full bg-slate-50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
