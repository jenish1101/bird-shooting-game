import type { RefObject } from "react";

/**
 * The laughing dog lives here — a separate panel OUTSIDE the playfield, so the
 * hunter's line of fire is never covered by a dog's fat head.
 */
export function DogCam({
  canvasRef,
  active,
  big,
  text,
  playing,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
  big: boolean;
  text: string;
  playing: boolean;
}) {
  return (
    <div
      className={`relative flex h-32 shrink-0 flex-col border-t-4 transition-colors duration-200 sm:h-auto sm:w-56 sm:border-t-0 sm:border-l-4 ${
        active
          ? big
            ? "border-rose-500/80 bg-rose-950/40"
            : "border-amber-500/80 bg-amber-950/30"
          : "border-amber-900/80 bg-stone-950"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-1 px-2.5 pt-1.5">
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-300/80">🐕 Dog Cam</span>
        <span
          className={`text-[9px] font-black uppercase tracking-widest ${
            active ? (big ? "text-rose-300" : "text-amber-200") : "text-stone-500"
          }`}
        >
          {active ? (big ? "● Laughing" : "● Hee hee") : playing ? "● Watching" : "● Idle"}
        </span>
      </div>

      {/* the dog animation itself — a separate canvas outside the playfield */}
      <div className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>

      {/* taunt caption (crisp HTML text that never touches the playfield) */}
      <div className="shrink-0 px-2 pb-1.5">
        <div
          className={`rounded-lg border px-2 py-1 text-center text-[10px] font-black uppercase tracking-wide transition-colors duration-200 sm:text-[11px] ${
            active
              ? big
                ? "border-rose-400/70 bg-rose-950/80 text-rose-100"
                : "border-amber-400/70 bg-amber-950/70 text-amber-100"
              : "border-stone-800 bg-stone-900/70 text-stone-500"
          }`}
        >
          {active ? `“${text}”` : playing ? "Waiting for a miss…" : "Not laughing. Yet."}
        </div>
      </div>
    </div>
  );
}
