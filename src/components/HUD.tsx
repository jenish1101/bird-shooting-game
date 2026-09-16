import { formatClock, type Snapshot } from "../game/engine";
import { getGun } from "../game/guns";

export function HUD({
  s,
  onPause,
  onReload,
  onToggleMute,
}: {
  s: Snapshot;
  onPause: () => void;
  onReload: () => void;
  onToggleMute: () => void;
}) {
  const gun = getGun(s.gunId);
  const shells = Array.from({ length: Math.min(s.mag, 12) });
  const perShell = s.mag > 12 ? Math.ceil(s.mag / 12) : 1;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none p-3 sm:p-4">
      {/* top bar */}
      <div className="flex items-start justify-between gap-2">
        <div className="rounded-xl border-2 border-amber-900/70 bg-stone-900/70 px-3 py-1.5 backdrop-blur-sm">
          <div className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-300/80">Score</div>
          <div className="text-xl font-black tabular-nums text-amber-100 sm:text-2xl">
            {s.score.toLocaleString()}
          </div>
          {s.prevBest > 0 ? (
            <div
              className={`text-[10px] font-bold tabular-nums ${
                s.score > s.prevBest ? "animate-pulse text-emerald-300" : "text-stone-400"
              }`}
            >
              {s.score > s.prevBest
                ? `★ RECORD +${(s.score - s.prevBest).toLocaleString()}`
                : `BEST ${s.prevBest.toLocaleString()} · ${(s.prevBest - s.score).toLocaleString()} TO GO`}
            </div>
          ) : (
            <div className="text-[10px] font-bold text-stone-400">
              BEST — · SET THE FIRST RECORD
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <div
            className={`rounded-xl border-2 px-4 py-1 text-center backdrop-blur-sm transition-colors ${
              s.levelTimeLeft <= 5
                ? "animate-pulse border-rose-400 bg-rose-950/80"
                : s.levelTimeLeft <= 10
                  ? "border-amber-500/80 bg-stone-900/70"
                  : "border-amber-900/70 bg-stone-900/70"
            }`}
          >
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-300/80">
              Level {s.round} / {s.levelsTotal}
            </div>
            <div
              className={`text-2xl font-black tabular-nums leading-none ${
                s.levelTimeLeft <= 5 ? "text-rose-300" : "text-amber-100"
              }`}
            >
              {formatClock(s.levelTimeLeft)}
            </div>
            <div className="text-[10px] font-bold text-stone-300">
              🐦 {s.levelCleared}/{s.levelGoal} cleared · {s.birdsLeft} left
            </div>
          </div>
          {/* level time bar */}
          <div className="h-1.5 w-36 overflow-hidden rounded-full bg-stone-900/70">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${
                s.levelTimeLeft <= 5 ? "bg-rose-400" : s.levelTimeLeft <= 10 ? "bg-amber-400" : "bg-emerald-400"
              }`}
              style={{ width: `${Math.max(0, Math.min(100, (s.levelTimeLeft / s.levelTime) * 100))}%` }}
            />
          </div>
          {/* escape budget */}
          <div
            className={`rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm ${
              s.escapesLeft <= 1
                ? "animate-pulse border-rose-400/80 bg-rose-950/70 text-rose-200"
                : "border-amber-900/70 bg-stone-900/70 text-stone-300"
            }`}
          >
            Escapes left {s.escapesLeft}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="rounded-xl border-2 border-amber-900/70 bg-stone-900/70 px-3 py-1.5 text-right backdrop-blur-sm">
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-300/80">Cash</div>
            <div className="text-lg font-black tabular-nums text-emerald-300">${s.coins}</div>
          </div>
          <div className="flex gap-1 rounded-xl border-2 border-amber-900/70 bg-stone-900/70 px-2 py-1 backdrop-blur-sm">
            {Array.from({ length: s.maxLives }).map((_, i) => (
              <span key={i} className={`text-sm ${i < s.lives ? "" : "opacity-25 grayscale"}`}>
                ❤️
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* bottom bar */}
      <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 sm:inset-x-4 sm:bottom-4">
        <div className="rounded-xl border-2 border-amber-900/70 bg-stone-900/70 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">{gun.emoji}</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-stone-200">{gun.name}</span>
          </div>
          <div className="mt-1 flex h-4 items-end gap-[3px]">
            {s.reloading ? (
              <span className="text-[11px] font-black uppercase tracking-widest text-sky-300">Reloading…</span>
            ) : (
              shells.map((_, i) => (
                <span
                  key={i}
                  className={`h-4 w-[6px] rounded-sm transition-colors ${
                    (i + 1) * perShell <= s.ammo ? "bg-amber-400" : "bg-stone-700"
                  }`}
                />
              ))
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex gap-2">
          <HudBtn label="R" title="Reload" onClick={onReload} />
          <HudBtn label={s.muted ? "🔇" : "🔊"} title="Sound" onClick={onToggleMute} />
          <HudBtn label="⏸" title="Pause" onClick={onPause} />
        </div>
      </div>
    </div>
  );
}

function HudBtn({ label, onClick, title }: { label: string; onClick: () => void; title: string }) {
  return (
    <button
      title={title}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
      className="h-11 w-11 rounded-xl border-2 border-amber-900/80 bg-stone-900/80 text-base font-black text-amber-200 backdrop-blur-sm transition-colors active:bg-stone-700"
    >
      {label}
    </button>
  );
}
