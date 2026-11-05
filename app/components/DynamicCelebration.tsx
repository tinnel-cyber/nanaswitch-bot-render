"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";

// Technique secrète 5 : Dynamic Import avec SSR désactivé (ssr: false)
// La bibliothèque canvas-confetti n'est chargée qu'au moment de l'événement en mémoire client
export default function DynamicCelebration({ trigger = false }: { trigger?: boolean }) {
  const [fired, setFired] = useState(false);

  useEffect(() => {
    if (trigger && !fired) {
      setFired(true);
      // Import asynchrone à la demande
      import("canvas-confetti").then((confettiModule) => {
        const confetti = (confettiModule as any).default || confettiModule;
        (confetti as any)({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#1d4ed8", "#3b82f6", "#10b981", "#f59e0b"],
        });
      }).catch((e) => console.warn("Notice confetti dynamic import:", e));
    }
  }, [trigger, fired]);

  if (!trigger) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold animate-bounce">
      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
      <span>Opération validée en toute souveraineté !</span>
    </div>
  );
}
