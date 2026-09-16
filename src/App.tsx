import { useCallback, useEffect, useRef, useState } from "react";
import {
  DURATIONS,
  Game,
  SESSION_PLANS,
  bestFor,
  durationLabel,
  loadDuration,
  loadScores,
  saveScore,
  type ScoreRow,
  type Snapshot,
} from "./game/engine";
import { HUD } from "./components/HUD";
import { DogCam } from "./components/DogCam";
import { GameOverScreen, PauseScreen, ShopScreen, StartScreen } from "./components/Overlays";

const initialState: Snapshot = {
  phase: "menu",
  score: 0,
  coins: 0,
  round: 1,
  lives: 3,
  maxLives: 3,
  ammo: 6,
  mag: 6,
  reloading: false,
  combo: 0,
  multiplier: 1,
  birdsLeft: 0,
  gunId: "pistol",
  owned: ["pistol"],
  roundHits: 0,
  roundShots: 0,
  roundEscaped: 0,
  roundBonus: 0,
  accuracy: 0,
  muted: false,
  duration: 300,
  levelsTotal: 10,
  levelTimeLeft: 30,
  levelTime: 30,
  levelGoal: 8,
  levelCleared: 0,
  escapesLeft: 3,
  retry: false,
  endReason: null,
  prevBest: 0,
  totalHits: 0,
  perfectRound: false,
  dogActive: false,
  dogBig: false,
  dogText: "",
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dogCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [state, setState] = useState<Snapshot>(initialState);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [isBest, setIsBest] = useState(false);
  const [duration, setDurationState] = useState<number>(300);
  const [bests, setBests] = useState<Record<number, number>>({});
  const prevPhase = useRef<Snapshot["phase"]>("menu");

  const refreshScores = useCallback((sec: number) => {
    setScores(loadScores(sec));
    const b: Record<number, number> = {};
    for (const d of DURATIONS) b[d] = bestFor(d);
    setBests(b);
  }, []);

  useEffect(() => {
    const d = loadDuration();
    setDurationState(d);
    refreshScores(d);
  }, [refreshScores]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas, setState);
    gameRef.current = game;
    game.setDuration(loadDuration());
    game.setDogCanvas(dogCanvasRef.current);

    const ro = new ResizeObserver(() => game.resize());
    ro.observe(canvas);
    const dog = dogCanvasRef.current;
    const roDog = dog ? new ResizeObserver(() => game.setDogCanvas(dog)) : null;
    if (dog && roDog) roDog.observe(dog);

    const onVis = () => {
      if (document.hidden) game.pause();
    };
    document.addEventListener("visibilitychange", onVis);
    const stopScroll = (e: TouchEvent) => e.preventDefault();
    canvas.addEventListener("touchstart", stopScroll, { passive: false });
    canvas.addEventListener("touchmove", stopScroll, { passive: false });

    return () => {
      ro.disconnect();
      roDog?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("touchstart", stopScroll);
      canvas.removeEventListener("touchmove", stopScroll);
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  // keep engine + score tables in sync with the chosen session length
  const chooseDuration = useCallback(
    (sec: number) => {
      setDurationState(sec);
      gameRef.current?.setDuration(sec);
      refreshScores(sec);
    },
    [refreshScores],
  );

  // persist the run when it ends, then refresh previous/current comparisons
  useEffect(() => {
    if (state.phase === "gameover" && prevPhase.current !== "gameover") {
      const prevTop = bestFor(state.duration);
      const rows = saveScore(state.score, state.round, state.duration);
      setScores(rows);
      setIsBest(state.score > prevTop && state.score > 0);
      const b: Record<number, number> = {};
      for (const d of DURATIONS) b[d] = bestFor(d);
      setBests(b);
    }
    prevPhase.current = state.phase;
  }, [state.phase, state.score, state.round, state.duration]);

  const start = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    g.setDuration(duration);
    g.startGame();
  }, [duration]);
  const resume = useCallback(() => gameRef.current?.resume(), []);
  const pause = useCallback(() => gameRef.current?.pause(), []);
  const quit = useCallback(() => gameRef.current?.quitToMenu(), []);
  const mute = useCallback(() => gameRef.current?.toggleMute(), []);
  const reload = useCallback(() => gameRef.current?.reloadNow(), []);
  const changeTime = useCallback(() => {
    gameRef.current?.quitToMenu();
    refreshScores(duration);
  }, [duration, refreshScores]);

  const playing = state.phase === "playing" || state.phase === "paused";

  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-gradient-to-b from-stone-950 via-stone-900 to-black p-0 sm:p-3">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-black sm:h-[86dvh] sm:max-h-[860px] sm:max-w-7xl sm:flex-row sm:rounded-3xl sm:border-4 sm:border-amber-900/70 sm:shadow-[0_30px_80px_rgba(0,0,0,0.75)]">
        {/* ---------- playfield (targets only, never blocked) ---------- */}
        <div className="relative min-h-0 min-w-0 flex-1">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none select-none"
            style={{ cursor: playing ? "none" : "default" }}
          />

          {playing && <HUD s={state} onPause={pause} onReload={reload} onToggleMute={mute} />}

          {state.phase === "menu" && (
            <StartScreen
              onStart={start}
              scores={scores}
              duration={duration}
              onSelectDuration={chooseDuration}
              bests={bests}
              prevBest={bests[duration] ?? 0}
            />
          )}
          {state.phase === "paused" && (
            <PauseScreen
              onResume={resume}
              onRestart={start}
              onQuit={quit}
              muted={state.muted}
              onToggleMute={mute}
            />
          )}
          {state.phase === "shop" && (
            <ShopScreen
              state={state}
              onBuy={(id) => gameRef.current?.buyGun(id)}
              onEquip={(id) => gameRef.current?.equip(id)}
              onNext={() => gameRef.current?.nextRound()}
            />
          )}
          {state.phase === "gameover" && (
            <GameOverScreen
              state={state}
              scores={scores}
              isBest={isBest}
              onRestart={start}
              onMenu={quit}
              onChangeTime={changeTime}
            />
          )}
        </div>

        {/* ---------- dog cam: outside the playfield so aim is never blocked ---------- */}
        <DogCam
          canvasRef={dogCanvasRef}
          active={state.dogActive}
          big={state.dogBig}
          text={state.dogText}
          playing={playing}
        />
      </div>

      <p className="hidden pt-3 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500 sm:block">
        Feather Fury · {durationLabel(duration)} hunt · {SESSION_PLANS[duration].levels} timed levels · Aim with
        mouse or WASD · Space / Click to fire · P to pause
      </p>
    </div>
  );
}
