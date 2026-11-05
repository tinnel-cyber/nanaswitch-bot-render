export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-6 font-sans">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <div className="w-6 h-6 rounded-lg bg-blue-500/50" />
        </div>
        <div className="h-4 w-32 bg-slate-800 rounded-md" />
        <div className="h-2 w-48 bg-slate-800/60 rounded-md" />
      </div>
    </div>
  );
}
