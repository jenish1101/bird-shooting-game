import type { ReactNode } from "react";
import { GUNS } from "../game/guns";
import {
  DURATIONS,
  SESSION_PLANS,
  durationLabel,
  type ScoreRow,
  type Snapshot,
} from "../game/engine";

export function ArcadeButton({
  children,
  onClick,
  tone = "amber",
  className = "",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "amber" | "red" | "slate" | "green";
  className?: string;
  disabled?: boolean;
}) {
  const tones: Record<string, string> = {
    amber: "bg-amber-400 text-stone-900 border-amber-700 hover:bg-amber-300 shadow-[0_6px_0_#b45309]",
    red: "bg-rose-500 text-white border-rose-800 hover:bg-rose-400 shadow-[0_6px_0_#9f1239]",
    green: "bg-emerald-400 text-stone-900 border-emerald-700 hover:bg-emerald-300 shadow-[0_6px_0_#065f46]",
    slate: "bg-stone-700 text-stone-100 border-stone-900 hover:bg-stone-600 shadow-[0_6px_0_#1c1917]",
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`select-none rounded-xl border-2 px-6 py-3 text-base font-black uppercase tracking-widest transition-all active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`w-full rounded-2xl border-4 border-amber-900/80 bg-stone-900/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

function Title({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="text-center">
      <h1 className="bg-gradient-to-b from-amber-200 via-amber-400 to-orange-600 bg-clip-text text-4xl font-black uppercase tracking-tight text-transparent drop-shadow-[0_3px_0_rgba(0,0,0,0.55)] sm:text-6xl">
        {text}
      </h1>
      {sub && <p className="mt-1 text-xs font-bold uppercase tracking-[0.35em] text-amber-200/70 sm:text-sm">{sub}</p>}
    </div>
  );
}

export function ScoreTable({
  rows,
  duration,
  highlight,
}: {
  rows: ScoreRow[];
  duration?: number;
  highlight?: number;
}) {
  return (
    <div className="rounded-xl border-2 border-amber-900/60 bg-black/40 p-3">
      <div className="mb-2 text-center text-[11px] font-black uppercase tracking-[0.3em] text-amber-300">
        Top Marksmen {duration ? `· ${durationLabel(duration)}` : ""}
      </div>
      {rows.length === 0 ? (
        <p className="py-2 text-center text-xs text-stone-400">
          No {duration ? durationLabel(duration) : ""} scores yet. Be the first legend.
        </p>
      ) : (
        <ol className="space-y-1">
          {rows.map((r, i) => (
            <li
              key={`${r.score}-${i}`}
              className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-bold ${
                highlight !== undefined && r.score === highlight
                  ? "bg-amber-500/25 text-amber-100 ring-1 ring-amber-400/60"
                  : "bg-stone-800/60 text-stone-200"
              }`}
            >
              <span className="w-6 text-amber-400">{i + 1}.</span>
              <span className="flex-1 tabular-nums">{r.score.toLocaleString()}</span>
              <span className="text-xs font-semibold text-stone-400">
                {duration ? "" : `${durationLabel(r.duration)} · `}RD {r.round} · {r.date}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function DurationPicker({
  value,
  onChange,
  bests,
}: {
  value: number;
  onChange: (sec: number) => void;
  bests: Record<number, number>;
}) {
  return (
    <div className="rounded-xl border-2 border-amber-900/60 bg-amber-950/30 p-3">
      <div className="mb-2 text-center text-[11px] font-black uppercase tracking-[0.3em] text-amber-300">
        Choose Session Length
      </div>
      <div className="grid grid-cols-3 gap-2">
        {DURATIONS.map((d) => {
          const selected = value === d;
          const best = bests[d] ?? 0;
          return (
            <button
              key={d}
              onClick={() => onChange(d)}
              className={`rounded-xl border-2 px-2 py-2 text-center transition-all active:scale-95 ${
                selected
                  ? "border-amber-300 bg-amber-400 text-stone-900 shadow-[0_4px_0_#b45309]"
                  : "border-stone-600 bg-stone-800/70 text-stone-200 hover:border-amber-500"
              }`}
            >
              <div className="text-lg font-black leading-none">{durationLabel(d)}</div>
              <div className={`mt-0.5 text-[10px] font-black uppercase tracking-wide ${selected ? "text-stone-800" : "text-amber-300/80"}`}>
                {SESSION_PLANS[d].levels} levels
              </div>
              <div className={`mt-0.5 text-[10px] font-bold uppercase tracking-wide ${selected ? "text-stone-800" : "text-stone-400"}`}>
                {best > 0 ? `Best ${best.toLocaleString()}` : "No record"}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-widest text-amber-200/60">
        The clock pauses in the shop · Lives scale with length
      </p>
    </div>
  );
}

export function StartScreen({
  onStart,
  scores,
  duration,
  onSelectDuration,
  bests,
  prevBest,
}: {
  onStart: () => void;
  scores: ScoreRow[];
  duration: number;
  onSelectDuration: (sec: number) => void;
  bests: Record<number, number>;
  prevBest: number;
}) {
  return (
    <Overlay>
      <Panel className="max-w-lg">
        <Title text="Feather Fury" sub="Duck-hunt style shooting gallery" />
        <div className="my-4 grid grid-cols-2 gap-2 text-[11px] font-semibold text-stone-300 sm:text-xs">
          <Tip icon="🖱️" text="Move to aim · Click / tap to fire" />
          <Tip icon="⌨️" text="WASD / Arrows + Space to shoot" />
          <Tip icon="🔁" text="R reloads · P or Esc pauses" />
          <Tip icon="🐕" text="Miss a bird and the dog WILL laugh" />
        </div>
        <div className="mb-3">
          <DurationPicker value={duration} onChange={onSelectDuration} bests={bests} />
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border-2 border-amber-900/60 bg-black/40 px-3 py-2 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              Previous Best
            </div>
            <div className="text-xl font-black tabular-nums text-stone-100">
              {prevBest > 0 ? prevBest.toLocaleString() : "—"}
            </div>
          </div>
          <div className="rounded-xl border-2 border-amber-900/60 bg-black/40 px-3 py-2 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              Current Run
            </div>
            <div className="text-xl font-black tabular-nums text-amber-300">0</div>
          </div>
        </div>
        <div className="mb-4 rounded-xl border-2 border-amber-900/60 bg-amber-950/40 p-3 text-center text-xs font-bold text-amber-200">
          {SESSION_PLANS[duration].levels} timed levels. Clear every bird in a level before the level clock runs
          out — {SESSION_PLANS[duration].allowedLo} escapes allowed. Finish all levels to win the session.
        </div>
        <div className="flex flex-col items-center gap-3">
          <ArcadeButton onClick={onStart} tone="amber" className="w-full text-xl">
            ▶ Start {durationLabel(duration)} Hunt
          </ArcadeButton>
          <div className="w-full">
            <ScoreTable rows={scores} duration={duration} />
          </div>
        </div>
      </Panel>
    </Overlay>
  );
}

function Tip({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-stone-800/70 px-3 py-2">
      <span className="text-base">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-[2px]">
      <div className="my-auto w-full max-w-lg">{children}</div>
    </div>
  );
}

export function PauseScreen({
  onResume,
  onRestart,
  onQuit,
  muted,
  onToggleMute,
}: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <Overlay>
      <Panel className="max-w-sm">
        <Title text="Paused" />
        <div className="mt-6 flex flex-col gap-3">
          <ArcadeButton onClick={onResume} tone="green">
            Resume
          </ArcadeButton>
          <ArcadeButton onClick={onRestart} tone="amber">
            Restart
          </ArcadeButton>
          <ArcadeButton onClick={onToggleMute} tone="slate">
            {muted ? "🔇 Sound Off" : "🔊 Sound On"}
          </ArcadeButton>
          <ArcadeButton onClick={onQuit} tone="red">
            Main Menu
          </ArcadeButton>
        </div>
      </Panel>
    </Overlay>
  );
}

export function ShopScreen({
  state,
  onBuy,
  onEquip,
  onNext,
}: {
  state: Snapshot;
  onBuy: (id: string) => void;
  onEquip: (id: string) => void;
  onNext: () => void;
}) {
  const perfect = state.roundEscaped === 0;
  return (
    <Overlay>
      <Panel className="max-w-2xl">
        <Title
          text={state.retry ? `Level ${state.round} Failed` : `Level ${state.round} Clear`}
          sub={
            state.retry
              ? `Retrying · ${state.lives}/${state.maxLives} lives left`
              : perfect
                ? "Flawless! No escapees"
                : "Cleared — the dog still saw you slip"
          }
        />
        <div
          className={`my-3 rounded-xl border-2 py-2 text-center text-xs font-black uppercase tracking-widest ${
            state.retry
              ? "border-rose-700/70 bg-rose-950/40 text-rose-200"
              : "border-emerald-700/60 bg-emerald-950/40 text-emerald-300"
          }`}
        >
          {state.retry ? "🔁 Level repeats here — no progress lost" : `▶ Next: Level ${state.round + 1} of ${state.levelsTotal}`}{" "}
          · 🎯 {state.score.toLocaleString()} pts (best {state.prevBest.toLocaleString()})
        </div>
        <div className="my-4 grid grid-cols-4 gap-2 text-center">
          <Stat label="Hits" value={`${state.roundHits}/${state.roundShots}`} />
          <Stat label="Accuracy" value={`${state.accuracy}%`} />
          <Stat label="Bonus" value={`+${state.roundBonus}`} />
          <Stat label="Cash" value={`$${state.coins}`} tone="amber" />
        </div>
        {perfect && (
          <p className="mb-2 text-center text-[11px] font-black uppercase tracking-widest text-amber-300">
            ❤️ Perfect round · {state.lives}/{state.maxLives} lives
          </p>
        )}
        <div className="mb-2 text-center text-[11px] font-black uppercase tracking-[0.3em] text-amber-300">
          Gun Shop
        </div>
        <div className="grid max-h-[40vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {GUNS.map((g) => {
            const owned = state.owned.includes(g.id);
            const equipped = state.gunId === g.id;
            const afford = state.coins >= g.cost;
            return (
              <div
                key={g.id}
                className={`rounded-xl border-2 p-3 transition-colors ${
                  equipped ? "border-emerald-400 bg-emerald-900/30" : "border-stone-700 bg-stone-800/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{g.emoji}</span>
                    <span className="text-sm font-black uppercase tracking-wide text-stone-100">{g.name}</span>
                  </div>
                  {owned ? (
                    <button
                      onClick={() => onEquip(g.id)}
                      disabled={equipped}
                      className="rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-stone-900 disabled:bg-stone-600 disabled:text-stone-300"
                    >
                      {equipped ? "Equipped" : "Equip"}
                    </button>
                  ) : (
                    <button
                      onClick={() => onBuy(g.id)}
                      disabled={!afford}
                      className="rounded-lg bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-stone-900 disabled:bg-stone-600 disabled:text-stone-400"
                    >
                      ${g.cost}
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-stone-400">{g.blurb}</p>
                <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold uppercase text-stone-300">
                  <Chip>{g.mag} rounds</Chip>
                  <Chip>{g.pellets > 1 ? `${g.pellets} pellets` : `${(1 / g.fireDelay).toFixed(1)}/s`}</Chip>
                  <Chip>×{g.scoreMul} score</Chip>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-center">
          <ArcadeButton onClick={onNext} tone={state.retry ? "red" : "amber"} className="w-full text-lg">
            {state.retry
              ? `↻ Retry Level ${state.round}`
              : state.round >= state.levelsTotal
                ? "★ Finish Session"
                : `▶ Level ${state.round + 1} of ${state.levelsTotal}`}
          </ArcadeButton>
        </div>
      </Panel>
    </Overlay>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded bg-stone-900/80 px-2 py-0.5">{children}</span>;
}

function Stat({ label, value, tone = "stone" }: { label: string; value: string; tone?: "stone" | "amber" }) {
  return (
    <div className="rounded-xl border-2 border-stone-700 bg-stone-800/60 px-2 py-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{label}</div>
      <div className={`text-lg font-black ${tone === "amber" ? "text-amber-300" : "text-stone-100"}`}>{value}</div>
    </div>
  );
}

export function GameOverScreen({
  state,
  scores,
  isBest,
  onRestart,
  onMenu,
  onChangeTime,
}: {
  state: Snapshot;
  scores: ScoreRow[];
  isBest: boolean;
  onRestart: () => void;
  onMenu: () => void;
  onChangeTime: () => void;
}) {
  const cleared = state.endReason === "complete";
  const prev = state.prevBest;
  const delta = state.score - prev;
  return (
    <Overlay>
      <Panel className="max-w-lg">
        <div className="mb-2 text-center text-6xl">{cleared ? "🏆" : "🐕"}</div>
        <Title
          text={cleared ? "Session Complete!" : "Out of Lives"}
          sub={
            cleared
              ? `All ${state.levelsTotal} levels of the ${durationLabel(state.duration)} hunt cleared`
              : `Fell at level ${state.round} of ${state.levelsTotal} — the dog is laughing`
          }
        />
        <div className="my-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border-2 border-amber-500/70 bg-amber-500/10 px-3 py-2 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/80">
              Current Score
            </div>
            <div className="text-3xl font-black tabular-nums text-amber-200">
              {state.score.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border-2 border-stone-700 bg-stone-800/60 px-3 py-2 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              Previous Best
            </div>
            <div className="text-3xl font-black tabular-nums text-stone-100">
              {prev > 0 ? prev.toLocaleString() : "—"}
            </div>
          </div>
        </div>

        <div className="mb-3 rounded-xl border-2 border-stone-700 bg-black/40 px-3 py-2 text-center text-xs font-black uppercase tracking-widest">
          {isBest ? (
            <span className="animate-pulse text-amber-300">
              🏆 New {durationLabel(state.duration)} record! +{Math.max(0, delta).toLocaleString()} over your best
            </span>
          ) : prev === 0 ? (
            <span className="text-emerald-300">First {durationLabel(state.duration)} run — record set!</span>
          ) : (
            <span className="text-rose-300">
              {Math.abs(delta).toLocaleString()} short of your best — the dog is still laughing
            </span>
          )}
        </div>

        <div className="mb-3 grid grid-cols-4 gap-2 text-center">
          <Stat label="Level" value={`${state.round}/${state.levelsTotal}`} />
          <Stat label="Birds" value={String(state.totalHits)} />
          <Stat
            label="Accuracy"
            value={`${state.roundShots ? Math.round((state.roundHits / state.roundShots) * 100) : 0}%`}
          />
          <Stat label="Lives Left" value={String(state.lives)} />
        </div>

        <ScoreTable rows={scores} duration={state.duration} highlight={state.score} />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <ArcadeButton onClick={onRestart} tone="amber" className="flex-1">
            ↻ Play {durationLabel(state.duration)} Again
          </ArcadeButton>
          <ArcadeButton onClick={onChangeTime} tone="slate" className="flex-1">
            ⏱ Change Time
          </ArcadeButton>
          <ArcadeButton onClick={onMenu} tone="red" className="flex-1">
            Menu
          </ArcadeButton>
        </div>
      </Panel>
    </Overlay>
  );
}
