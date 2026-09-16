import { audio } from "./audio";
import { GUNS, getGun, type Gun } from "./guns";

export type Phase = "menu" | "playing" | "paused" | "shop" | "gameover";

export type EndReason = "complete" | "lives" | null;

export interface SessionPlan {
  /** how many levels this session contains */
  levels: number;
  birdsLo: number;
  birdsHi: number;
  secPerBirdLo: number;
  secPerBirdHi: number;
  levelBase: number;
  /** escapes allowed before the level fails (early levels are forgiving) */
  allowedLo: number;
  allowedHi: number;
}

/** 1 / 5 / 10 minute sessions are expressed as level counts, not a hard global clock. */
export const SESSION_PLANS: Record<number, SessionPlan> = {
  60: { levels: 4, birdsLo: 4, birdsHi: 8, secPerBirdLo: 1.5, secPerBirdHi: 2.2, levelBase: 6, allowedLo: 3, allowedHi: 2 },
  300: { levels: 10, birdsLo: 5, birdsHi: 12, secPerBirdLo: 1.6, secPerBirdHi: 2.6, levelBase: 8, allowedLo: 3, allowedHi: 2 },
  600: { levels: 18, birdsLo: 6, birdsHi: 15, secPerBirdLo: 1.5, secPerBirdHi: 2.6, levelBase: 8, allowedLo: 3, allowedHi: 2 },
};

export interface Snapshot {
  phase: Phase;
  score: number;
  coins: number;
  /** current level (1-based) */
  round: number;
  levelsTotal: number;
  lives: number;
  maxLives: number;
  ammo: number;
  mag: number;
  reloading: boolean;
  combo: number;
  multiplier: number;
  birdsLeft: number;
  gunId: string;
  owned: string[];
  roundHits: number;
  roundShots: number;
  roundEscaped: number;
  roundBonus: number;
  accuracy: number;
  muted: boolean;
  /** session length key (seconds) chosen on the menu */
  duration: number;
  /** seconds left in the current level (not a whole-session timer) */
  levelTimeLeft: number;
  levelTime: number;
  /** birds required to clear the level */
  levelGoal: number;
  /** birds already brought down this level */
  levelCleared: number;
  /** escapes still tolerated before the level fails */
  escapesLeft: number;
  /** level was failed and will be retried after the shop */
  retry: boolean;
  /** why the run finished */
  endReason: EndReason;
  /** best score for this session length before the current run */
  prevBest: number;
  /** birds bagged across the whole run */
  totalHits: number;
  /** was the last level perfect (no escapees) */
  perfectRound: boolean;
  /** the laughing dog is currently in the DOG CAM panel */
  dogActive: boolean;
  dogBig: boolean;
  /** the taunt line currently shown next to the dog */
  dogText: string;
}

export interface ScoreRow {
  score: number;
  round: number;
  /** session length in seconds the run was played with */
  duration: number;
  date: string;
}

const SCORE_KEY = "featherfury.scores.v2";
const DUR_KEY = "featherfury.duration.v1";

/** selectable session lengths (seconds) */
export const DURATIONS = [60, 300, 600] as const;
export const DEFAULT_DURATION = 300;

export function durationLabel(sec: number): string {
  if (sec < 60) return `${sec}s`;
  return `${Math.round(sec / 60)} min`;
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function allScores(): ScoreRow[] {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ScoreRow[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => r && typeof r.score === "number")
      .map((r) => ({ score: r.score, round: r.round ?? 1, duration: r.duration ?? 300, date: r.date ?? "" }));
  } catch {
    return [];
  }
}

/** Best rows for a given session length (or all lengths when omitted). */
export function loadScores(duration?: number): ScoreRow[] {
  const rows = allScores();
  const filtered = duration ? rows.filter((r) => r.duration === duration) : rows;
  return filtered.sort((a, b) => b.score - a.score).slice(0, 6);
}

/** Best (previous) score for a session length. */
export function bestFor(duration: number): number {
  return allScores()
    .filter((r) => r.duration === duration)
    .reduce((m, r) => Math.max(m, r.score), 0);
}

export function totalRuns(): number {
  return allScores().length;
}

export function saveScore(score: number, round: number, duration: number): ScoreRow[] {
  const rows = allScores();
  rows.push({ score, round, duration, date: new Date().toLocaleDateString() });
  rows.sort((a, b) => b.score - a.score);
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify(rows.slice(0, 40)));
  } catch {
    /* ignore */
  }
  return loadScores(duration);
}

export function loadDuration(): number {
  try {
    const v = Number(localStorage.getItem(DUR_KEY));
    if (DURATIONS.includes(v as (typeof DURATIONS)[number])) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_DURATION;
}

export function saveDuration(sec: number) {
  try {
    localStorage.setItem(DUR_KEY, String(sec));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- entities

interface BirdType {
  id: string;
  size: number;
  speed: number;
  points: number;
  body: string;
  wing: string;
  belly: string;
  bob: number;
}

const BIRD_TYPES: BirdType[] = [
  { id: "pigeon", size: 26, speed: 145, points: 100, body: "#6b7ba0", wing: "#4a5878", belly: "#c8d3e6", bob: 26 },
  { id: "sparrow", size: 20, speed: 230, points: 180, body: "#b06a2c", wing: "#8a4d1c", belly: "#f0d9b5", bob: 46 },
  { id: "crow", size: 33, speed: 115, points: 80, body: "#32323f", wing: "#1d1d26", belly: "#4a4a5c", bob: 16 },
  { id: "parrot", size: 24, speed: 195, points: 220, body: "#22c55e", wing: "#15803d", belly: "#bbf7d0", bob: 58 },
  { id: "golden", size: 22, speed: 310, points: 600, body: "#fbbf24", wing: "#d97706", belly: "#fef3c7", bob: 70 },
];

interface Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  type: BirdType;
  dir: number;
  flap: number;
  flapSpeed: number;
  baseY: number;
  bobPhase: number;
  state: "fly" | "hit" | "fall";
  hitT: number;
  rot: number;
  spin: number;
  scale: number;
  /** true once the bird has flown into the shootable area of the screen */
  entered: boolean;
  /** decorative menu birds never cost lives or summon the dog */
  ambient: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "feather" | "spark" | "smoke" | "ring" | "star";
  rot: number;
  vr: number;
  grav: number;
}

interface Floater {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
}

interface Cloud {
  x: number;
  y: number;
  s: number;
  v: number;
}

interface Dog {
  active: boolean;
  x: number;
  t: number;
  dur: number;
  big: boolean;
  phase: "rise" | "laugh" | "sink";
}

interface Theme {
  sky: [string, string, string];
  sun: string;
  hillFar: string;
  hillMid: string;
  hillNear: string;
  ground: string;
  grass: string;
  tree: string;
  stars: boolean;
  haze: string;
}

const THEMES: Theme[] = [
  {
    sky: ["#7dd3fc", "#bae6fd", "#fef3c7"],
    sun: "#fde68a",
    hillFar: "#86b8a1",
    hillMid: "#5d9b7f",
    hillNear: "#3f7d63",
    ground: "#2f6b4f",
    grass: "#27593f",
    tree: "#1f5340",
    stars: false,
    haze: "rgba(255,255,255,0.25)",
  },
  {
    sky: ["#fb923c", "#f97316", "#fcd34d"],
    sun: "#fff7ed",
    hillFar: "#9a6a52",
    hillMid: "#7a4b3d",
    hillNear: "#5a3430",
    ground: "#3c241f",
    grass: "#2f1c19",
    tree: "#241413",
    stars: false,
    haze: "rgba(255,200,120,0.25)",
  },
  {
    sky: ["#312e81", "#6d28d9", "#f472b6"],
    sun: "#fbcfe8",
    hillFar: "#4c3b82",
    hillMid: "#3b2d66",
    hillNear: "#2a2049",
    ground: "#1d1636",
    grass: "#171029",
    tree: "#120d21",
    stars: true,
    haze: "rgba(180,140,255,0.22)",
  },
  {
    sky: ["#0b1026", "#16214d", "#2b3f7a"],
    sun: "#e2e8f0",
    hillFar: "#1f2a52",
    hillMid: "#18203f",
    hillNear: "#111730",
    ground: "#0c1024",
    grass: "#080b1a",
    tree: "#05070f",
    stars: true,
    haze: "rgba(120,160,255,0.18)",
  },
];

const MISS_TAUNTS = [
  "You missed!",
  "Ha ha! Terrible!",
  "My grandma shoots better!",
  "Air ball!",
  "The sky is not a target!",
  "Whiff!",
  "Aim next time, champ!",
];

const ESCAPE_TAUNTS = [
  "It got away!",
  "The bird wins!",
  "Ha ha ha! Escaped!",
  "You let it fly!",
  "Pathetic!",
];

const HIT_CALLS = ["Nice shot!", "Boom!", "Got him!", "Beautiful!", "Direct hit!"];
const STREAK_CALLS = ["Unstoppable!", "He is on fire!", "Triple threat!", "Sharpshooter!"];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

// ---------------------------------------------------------------- engine

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private onState: (s: Snapshot) => void;

  w = 960;
  h = 540;
  dpr = 1;
  private raf = 0;
  private last = 0;
  private acc = 0;

  phase: Phase = "menu";
  score = 0;
  coins = 0;
  /** current level, 1-based */
  round = 1;
  lives = 3;
  maxLives = 3;
  /** session length key in seconds (selects the level plan) */
  duration = DEFAULT_DURATION;
  levelsTotal = SESSION_PLANS[DEFAULT_DURATION].levels;
  endReason: EndReason = null;
  prevBest = 0;
  totalHits = 0;
  perfectRound = false;

  // ---- level state
  levelGoal = 0;
  levelCleared = 0;
  levelTime = 30;
  levelTimeLeft = 30;
  escapesLeft = 3;
  retry = false;
  private pendingEnd: { reason: Exclude<EndReason, null>; t: number } | null = null;
  private lastBeep = 99;
  private warnedLastLife = false;
  private warnedOneEscape = false;
  combo = 0;
  comboTimer = 0;
  owned = ["pistol"];
  gun: Gun = GUNS[0];
  ammo = GUNS[0].mag;
  reloadT = 0;
  fireCooldown = 0;

  private birds: Bird[] = [];
  private parts: Particle[] = [];
  private floats: Floater[] = [];
  private clouds: Cloud[] = [];
  private dog: Dog = { active: false, x: 0, t: 0, dur: 1, big: false, phase: "rise" };
  private dogCooldown = 0;

  private toSpawn = 0;
  private spawnTimer = 0;
  private spawnGap = 1;
  private roundEnd = -1;
  roundHits = 0;
  roundShots = 0;
  roundEscaped = 0;
  roundBonus = 0;

  private shake = 0;
  private shakeT = 0;
  private flash = 0;
  private hitStop = 0;
  private recoil = 0;
  private gunKick = 0;
  private timeScale = 1;

  aim = { x: 480, y: 300 };
  private aimVel = { x: 0, y: 0 };
  private keys = new Set<string>();
  private pointerDown = false;
  private usingTouch = false;
  private themeIdx = 0;
  private bgDirty = true;
  private grassSeed: number[] = [];
  private lastSnap = "";
  private banner = { text: "", sub: "", t: 0 };
  private vignette: CanvasGradient | null = null;
  private dogCanvas: HTMLCanvasElement | null = null;
  private dogCtx: CanvasRenderingContext2D | null = null;
  private dogSize = { w: 0, h: 0 };
  private dogScale = 1;
  /** taunt currently being shown in the dog cam (HTML caption) */
  dogText = "";

  constructor(canvas: HTMLCanvasElement, onState: (s: Snapshot) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.bg = document.createElement("canvas");
    this.bgCtx = this.bg.getContext("2d")!;
    this.onState = onState;
    this.resize();
    this.bindEvents();
    this.spawnAmbientBirds();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // -------------------------------------------------------------- lifecycle

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    audio.stopSpeech();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(320, Math.round(rect.width));
    this.h = Math.max(240, Math.round(rect.height));
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.bg.width = this.canvas.width;
    this.bg.height = this.canvas.height;
    this.bgDirty = true;
    this.vignette = null;
    this.aim.x = clamp(this.aim.x, 0, this.w);
    this.aim.y = clamp(this.aim.y, 0, this.h);
    this.grassSeed = Array.from({ length: Math.ceil(this.w / 9) + 4 }, () => Math.random());
    this.clouds = Array.from({ length: 5 }, () => ({
      x: rnd(0, this.w),
      y: rnd(this.h * 0.08, this.h * 0.38),
      s: rnd(0.6, 1.5),
      v: rnd(6, 16),
    }));
  }

  // -------------------------------------------------------------- input

  private bindEvents() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
  }

  private localPoint(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onPointerDown = (e: PointerEvent) => {
    audio.init();
    if (this.phase !== "playing") return;
    e.preventDefault();
    this.usingTouch = e.pointerType === "touch";
    const p = this.localPoint(e);
    this.aim.x = p.x;
    this.aim.y = p.y;
    this.pointerDown = true;
    this.tryShoot();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.phase !== "playing") return;
    if (e.pointerType === "touch" && !this.pointerDown) return;
    const p = this.localPoint(e);
    if (p.x < -40 || p.y < -40 || p.x > this.w + 40 || p.y > this.h + 40) return;
    this.usingTouch = e.pointerType === "touch";
    this.aim.x = clamp(p.x, 0, this.w);
    this.aim.y = clamp(p.y, 0, this.h);
  };

  private onPointerUp = () => {
    this.pointerDown = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "spacebar"].includes(k)) e.preventDefault();
    this.keys.add(k);
    if (k === "p" || k === "escape") {
      if (this.phase === "playing") this.pause();
      else if (this.phase === "paused") this.resume();
    }
    if (k === "r" && this.phase === "playing") this.startReload();
    if (k === "m") this.toggleMute();
    if ((k === " " || k === "spacebar") && this.phase === "playing") this.tryShoot();
    const confirm = k === "enter" || k === " " || k === "spacebar";
    if (confirm && (this.phase === "menu" || this.phase === "gameover")) this.startGame();
    else if (confirm && this.phase === "shop") this.nextRound();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  // -------------------------------------------------------------- public API

  /** Choose the session length before (or between) runs. */
  setDuration(sec: number) {
    this.duration = sec;
    this.levelsTotal = (SESSION_PLANS[sec] ?? SESSION_PLANS[DEFAULT_DURATION]).levels;
    saveDuration(sec);
    this.prevBest = bestFor(sec);
    this.emit(true);
  }

  startGame() {
    audio.init();
    this.score = 0;
    this.coins = 300;
    this.round = 1;
    this.pendingEnd = null;
    this.timeScale = 1;
    this.banner = { text: "", sub: "", t: 0 };
    this.retry = false;
    // longer sessions get more lives, since the dog has more chances to laugh
    this.maxLives = this.duration >= 600 ? 5 : this.duration >= 300 ? 4 : 3;
    this.lives = this.maxLives;
    this.combo = 0;
    this.totalHits = 0;
    this.warnedLastLife = false;
    this.owned = ["pistol"];
    this.equip("pistol");
    this.birds = [];
    this.parts = [];
    this.floats = [];
    this.endReason = null;
    this.prevBest = bestFor(this.duration);
    this.phase = "playing";
    this.startLevel();
  }

  pause() {
    if (this.phase !== "playing" || this.pendingEnd) return;
    this.phase = "paused";
    audio.stopSpeech();
    this.emit(true);
  }

  resume() {
    if (this.phase !== "paused") return;
    this.phase = "playing";
    this.last = performance.now();
    this.emit(true);
  }

  quitToMenu() {
    this.phase = "menu";
    this.birds = [];
    this.parts = [];
    this.floats = [];
    this.pendingEnd = null;
    this.retry = false;
    this.timeScale = 1;
    this.banner = { text: "", sub: "", t: 0 };
    this.spawnAmbientBirds();
    audio.stopSpeech();
    this.emit(true);
  }

  toggleMute() {
    audio.muted = !audio.muted;
    if (audio.muted) audio.stopSpeech();
    this.emit(true);
  }

  buyGun(id: string) {
    const g = getGun(id);
    if (this.owned.includes(id) || this.coins < g.cost) {
      audio.emptyClick();
      return;
    }
    this.coins -= g.cost;
    this.owned.push(id);
    audio.coin();
    audio.shout(`${g.name} purchased!`, 300);
    this.equip(id);
  }

  equip(id: string) {
    if (!this.owned.includes(id)) return;
    this.gun = getGun(id);
    this.ammo = this.gun.mag;
    this.reloadT = 0;
    audio.click();
    this.emit(true);
  }

  reloadNow() {
    if (this.phase !== "playing") return;
    this.startReload();
  }

  /** Advance to the next level (or retry the failed one) after the shop. */
  nextRound() {
    const retrying = this.retry;
    if (!retrying) this.round++;
    this.retry = false;
    this.phase = "playing";
    this.last = performance.now();
    this.startLevel(retrying);
  }

  // -------------------------------------------------------------- levels

  /** Level shape: more birds + less time per bird as levels go up. */
  private levelConfig() {
    const plan = SESSION_PLANS[this.duration] ?? SESSION_PLANS[DEFAULT_DURATION];
    const t = this.levelsTotal > 1 ? (this.round - 1) / (this.levelsTotal - 1) : 1;
    const birds = Math.round(plan.birdsLo + t * (plan.birdsHi - plan.birdsLo));
    const perBird = plan.secPerBirdHi + t * (plan.secPerBirdLo - plan.secPerBirdHi);
    const time = Math.round(birds * perBird + plan.levelBase);
    const allowed = Math.round(plan.allowedLo + t * (plan.allowedHi - plan.allowedLo));
    return { birds, time, allowed, spawnGap: clamp(time / (birds + 2), 0.45, 2.2) };
  }

  private startLevel(retrying = false) {
    const cfg = this.levelConfig();
    this.themeIdx = (this.round - 1) % THEMES.length;
    this.bgDirty = true;
    this.toSpawn = cfg.birds;
    this.spawnGap = cfg.spawnGap;
    this.spawnTimer = 0.6;
    this.roundHits = 0;
    this.roundShots = 0;
    this.roundEscaped = 0;
    this.roundBonus = 0;
    this.roundEnd = -1;
    this.birds = [];
    this.ammo = this.gun.mag;
    this.reloadT = 0;
    this.levelGoal = cfg.birds;
    this.levelCleared = 0;
    this.levelTime = cfg.time;
    this.levelTimeLeft = cfg.time;
    this.escapesLeft = cfg.allowed;
    this.lastBeep = 99;
    this.warnedOneEscape = false;
    this.banner = {
      text: retrying ? `RETRY LEVEL ${this.round}` : `LEVEL ${this.round} OF ${this.levelsTotal}`,
      sub: `CLEAR ${cfg.birds} BIRDS IN ${cfg.time}s · ${cfg.allowed} ESCAPES ALLOWED`,
      t: 2.2,
    };
    audio.roundStart();
    audio.shout(
      retrying
        ? `Level ${this.round} again. Focus up!`
        : `Level ${this.round} of ${this.levelsTotal}. Clear ${cfg.birds} birds!`,
      200,
    );
    this.emit(true);
  }

  private finishRound() {
    const perfect = this.roundEscaped === 0;
    this.perfectRound = perfect;
    this.roundBonus = perfect ? 200 + this.round * 120 : Math.max(0, this.roundHits * 25);
    this.score += this.roundBonus;
    this.coins += Math.floor(this.roundBonus / 4) + 120;
    if (perfect && this.lives < this.maxLives) this.lives++; // flawless levels win a life back

    this.retry = false;
    // Session is over only when every level has been cleared — a real finish line.
    if (this.round >= this.levelsTotal) {
      this.requestEnd("complete");
      return;
    }
    this.phase = "shop";
    if (perfect) {
      audio.shout("Flawless level! Outstanding!", 200);
      audio.roundStart();
    } else {
      audio.shout("Level cleared. Spend your cash!", 200);
    }
    this.emit(true);
  }

  /** Level timed out (or too many escapes). Costly — but never a silent game over. */
  private failLevel(reason: "time" | "escapes") {
    if (this.pendingEnd || this.phase !== "playing") return;
    this.lives--;
    this.roundEscaped = reason === "time" ? Math.max(1, this.escapesLeft + 1) : this.roundEscaped;
    this.birds = [];
    this.combo = 0;
    const failText = reason === "time" ? "Time's up! Ha ha!" : "Too many escapees!";
    this.addShake(16);
    this.summonDog(true, failText);
    if (this.lives <= 1 && !this.warnedLastLife && this.lives === 1) {
      this.warnedLastLife = true;
      audio.shout("Last life, hunter! Do not blow it!", 0);
    }
    if (this.lives <= 0) {
      this.lives = 0;
      this.banner = { text: "NO LIVES LEFT", sub: "THE DOG IS LAUGHING…", t: 2.6 };
      audio.shout("No lives left! The dog wins!", 0);
      this.requestEnd("lives");
      return;
    }
    this.retry = true;
    this.banner = {
      text: "LEVEL FAILED",
      sub: `${this.lives} ${this.lives === 1 ? "LIFE" : "LIVES"} LEFT · LEVEL RETRY`,
      t: 2.4,
    };
    audio.shout(
      reason === "time" ? "Time up! Level failed!" : "Too many escapees! Level failed!",
      200,
    );
    this.phase = "shop";
    this.emit(true);
  }

  /**
   * Endings are never instant: the freeze-frame beat, the shouted call and the
   * banner all happen first, then the results screen opens.
   */
  private requestEnd(reason: Exclude<EndReason, null>) {
    if (this.pendingEnd) return;
    this.pendingEnd = { reason, t: 1.7 };
    this.addShake(18);
    if (reason === "complete") {
      this.banner = { text: "SESSION COMPLETE!", sub: `ALL ${this.levelsTotal} LEVELS CLEARED`, t: 1.9 };
      audio.shout("Session complete! All levels cleared!", 0);
      for (let i = 0; i < 40; i++) {
        this.parts.push({
          x: rnd(0, this.w),
          y: rnd(-40, this.h * 0.4),
          vx: rnd(-60, 60),
          vy: rnd(40, 160),
          life: rnd(1.2, 2.2),
          max: 2.2,
          size: rnd(4, 9),
          color: pick(["#fde047", "#fb7185", "#38bdf8", "#a3e635"]),
          kind: "star",
          rot: Math.random() * 6.28,
          vr: rnd(-6, 6),
          grav: 40,
        });
      }
    }
  }

  /** The run only ends here: every level cleared, or lives ran out after warnings. */
  private endRun(reason: Exclude<EndReason, null>) {
    this.endReason = reason;
    this.phase = "gameover";
    if (reason === "complete") {
      audio.roundStart();
      audio.shout("Session complete! All levels cleared!", 0);
    } else {
      audio.gameOver();
      audio.shout("Out of lives! The birds win!", 0);
    }
    this.emit(true);
  }

  // -------------------------------------------------------------- spawning

  private spawnAmbientBirds() {
    for (let i = 0; i < 4; i++) this.spawnBird(true);
  }

  private spawnBird(ambient = false) {
    const roll = Math.random();
    let type: BirdType;
    if (!ambient && roll > 0.96) type = BIRD_TYPES[4];
    else if (roll > 0.8) type = BIRD_TYPES[3];
    else if (roll > 0.55) type = BIRD_TYPES[1];
    else if (roll > 0.3) type = BIRD_TYPES[2];
    else type = BIRD_TYPES[0];

    const dir = Math.random() < 0.5 ? 1 : -1;
    const speedScale = ambient ? 0.45 : 1 + (this.round - 1) * 0.085;
    const y = rnd(this.h * 0.14, this.h * 0.62);
    const b: Bird = {
      x: dir === 1 ? -60 : this.w + 60,
      y,
      vx: dir * type.speed * speedScale * rnd(0.85, 1.15),
      vy: 0,
      t: 0,
      type,
      dir,
      flap: Math.random() * 6,
      flapSpeed: rnd(9, 14) * (ambient ? 0.6 : 1),
      baseY: y,
      bobPhase: Math.random() * 6.28,
      state: "fly",
      hitT: 0,
      rot: 0,
      spin: 0,
      scale: 1,
      entered: false,
      ambient,
    };
    this.birds.push(b);
  }

  // -------------------------------------------------------------- shooting

  private startReload() {
    if (this.reloadT > 0 || this.ammo >= this.gun.mag) return;
    this.reloadT = this.gun.reloadTime;
    audio.reload();
  }

  private tryShoot() {
    if (this.phase !== "playing") return;
    if (this.fireCooldown > 0) return;
    if (this.reloadT > 0) return;
    if (this.ammo <= 0) {
      audio.emptyClick();
      this.startReload();
      return;
    }
    this.ammo--;
    this.fireCooldown = this.gun.fireDelay;
    this.roundShots++;
    audio.shot(this.gun.sound);
    this.addShake(this.gun.shake);
    this.flash = Math.min(1, this.flash + 0.35);
    this.recoil = this.gun.recoil;
    this.gunKick = 1;

    const g = this.gun;
    const shots: { x: number; y: number }[] = [];
    for (let i = 0; i < g.pellets; i++) {
      if (i === 0 && g.pellets > 1) shots.push({ x: this.aim.x, y: this.aim.y });
      else {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * g.spread;
        shots.push({ x: this.aim.x + Math.cos(a) * r, y: this.aim.y + Math.sin(a) * r });
      }
    }

    // muzzle smoke + sparks at aim point
    for (let i = 0; i < 8; i++) {
      this.parts.push({
        x: this.aim.x,
        y: this.aim.y,
        vx: rnd(-160, 160),
        vy: rnd(-160, 160),
        life: rnd(0.12, 0.3),
        max: 0.3,
        size: rnd(1.5, 3.5),
        color: "#fff3c4",
        kind: "spark",
        rot: 0,
        vr: 0,
        grav: 260,
      });
    }
    this.parts.push({
      x: this.aim.x,
      y: this.aim.y,
      vx: 0,
      vy: 0,
      life: 0.28,
      max: 0.28,
      size: 6,
      color: "#ffffff",
      kind: "ring",
      rot: 0,
      vr: 0,
      grav: 0,
    });

    let hits = 0;
    let flyers = 0;
    const killed = new Set<Bird>();
    for (const b of this.birds) {
      if (b.state === "fly") flyers++;
    }
    for (const s of shots) {
      for (const b of this.birds) {
        if (b.state !== "fly" || killed.has(b)) continue;
        const r = b.type.size * 0.95 + g.aimAssist;
        const dx = b.x - s.x;
        const dy = b.y - s.y;
        if (dx * dx + dy * dy <= r * r) {
          killed.add(b);
          hits++;
          break;
        }
      }
    }

    if (hits > 0) {
      for (const b of killed) this.killBird(b);
    } else if (flyers > 0) {
      // Dog + taunt only appear when there was a live bird you failed to hit.
      this.onMiss();
    }
    this.emit();
    if (this.ammo === 0) this.startReload();
  }

  private killBird(b: Bird) {
    b.state = "hit";
    b.hitT = 0.14;
    b.spin = rnd(-9, 9);
    this.combo++;
    this.comboTimer = 3;
    this.roundHits++;
    this.levelCleared++;
    this.totalHits++;
    if (this.levelGoal > 0 && this.levelCleared === this.levelGoal) {
      this.banner = { text: "ALL BIRDS DOWN!", sub: "LEVEL CLEAR", t: 1.6 };
      audio.shout("Level cleared! Magnificent!", 300);
    }
    const mult = Math.min(1 + this.combo * 0.12, 4);
    const pts = Math.round(b.type.points * this.gun.scoreMul * mult);
    this.score += pts;
    this.coins += Math.max(6, Math.round(pts / 7));
    this.hitStop = 0.05;
    this.addShake(9);
    audio.hit();
    audio.squawk();

    this.floats.push({
      x: b.x,
      y: b.y - 10,
      vy: -46,
      life: 0.95,
      max: 0.95,
      text: `+${pts}`,
      color: b.type.id === "golden" ? "#fde047" : "#ffffff",
      size: b.type.id === "golden" ? 30 : 24,
    });
    if (this.combo >= 3 && this.combo % 3 === 0) {
      this.floats.push({
        x: b.x,
        y: b.y - 42,
        vy: -30,
        life: 1.1,
        max: 1.1,
        text: `${this.combo}x STREAK!`,
        color: "#fb7185",
        size: 22,
      });
      audio.shout(pick(STREAK_CALLS), 1500);
    } else if (Math.random() < 0.25) {
      audio.shout(pick(HIT_CALLS), 1800);
    }

    // feathers + poof
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3);
      const sp = rnd(70, 260);
      this.parts.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: rnd(0.7, 1.5),
        max: 1.5,
        size: rnd(4, 9),
        color: Math.random() < 0.5 ? b.type.body : b.type.belly,
        kind: "feather",
        rot: Math.random() * 6.28,
        vr: rnd(-7, 7),
        grav: 120,
      });
    }
    for (let i = 0; i < 6; i++) {
      this.parts.push({
        x: b.x,
        y: b.y,
        vx: rnd(-40, 40),
        vy: rnd(-60, -10),
        life: rnd(0.4, 0.8),
        max: 0.8,
        size: rnd(10, 22),
        color: "rgba(255,255,255,0.55)",
        kind: "smoke",
        rot: 0,
        vr: 0,
        grav: -20,
      });
    }
    if (b.type.id === "golden") {
      for (let i = 0; i < 16; i++) {
        this.parts.push({
          x: b.x,
          y: b.y,
          vx: rnd(-220, 220),
          vy: rnd(-260, 60),
          life: rnd(0.6, 1.2),
          max: 1.2,
          size: rnd(4, 8),
          color: "#fde047",
          kind: "star",
          rot: Math.random() * 6.28,
          vr: rnd(-8, 8),
          grav: 300,
        });
      }
      this.addShake(20);
      audio.shout("Golden bird! Jackpot!", 300);
    }
  }

  private onMiss() {
    this.combo = 0;
    this.floats.push({
      x: this.aim.x,
      y: this.aim.y - 16,
      vy: -34,
      life: 0.8,
      max: 0.8,
      text: "MISS",
      color: "#f87171",
      size: 20,
    });
    const taunt = pick(MISS_TAUNTS);
    this.summonDog(false, taunt);
    audio.shout(taunt, 1300);
  }

  /** Bring the dog into the DOG CAM panel only — never into the playfield. */
  private summonDog(big: boolean, text: string) {
    // one dog at a time, never stacked — and every dog is rate limited so it
    // can only ever appear as a reaction to an actual miss or escape
    if (this.dog.active) return;
    if (this.dogCooldown > 0) return;
    this.dogCooldown = big ? 2.4 : 2.0;
    this.dogText = text;
    this.dog = {
      active: true,
      x: this.aim.x,
      t: 0,
      dur: big ? 2.4 : 1.7,
      big,
      phase: "rise",
    };
    audio.laugh();
  }

  private addShake(mag: number) {
    this.shake = Math.max(this.shake, mag);
    this.shakeT = 0.42;
  }

  // -------------------------------------------------------------- loop

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    this.acc += dt;
    // fixed-ish stepping for stability
    const step = 1 / 120;
    let guard = 0;
    while (this.acc >= step && guard < 8) {
      this.update(step);
      this.acc -= step;
      guard++;
    }
    if (guard >= 8) this.acc = 0;
    this.render();
    this.renderDogCam();
    this.emit();
  };

  private update(dtRaw: number) {
    const active = this.phase === "playing" && !this.pendingEnd;
    let dt = dtRaw;
    if (this.hitStop > 0) {
      this.hitStop -= dtRaw;
      dt = dtRaw * 0.25;
    }
    this.timeScale += (1 - this.timeScale) * 0.1;

    // decay visuals (always run so menus feel alive)
    this.flash = Math.max(0, this.flash - dtRaw * 4);
    if (this.shakeT > 0) {
      this.shakeT -= dtRaw;
      if (this.shakeT <= 0) this.shake = 0;
    }
    this.recoil *= Math.pow(0.001, dtRaw);
    this.gunKick = Math.max(0, this.gunKick - dtRaw * 5);
    this.dogCooldown = Math.max(0, this.dogCooldown - dtRaw);
    this.banner.t = Math.max(0, this.banner.t - dtRaw);

    for (const c of this.clouds) {
      c.x += c.v * dtRaw * 0.35;
      if (c.x - 120 * c.s > this.w) c.x = -140 * c.s;
    }

    if (this.phase === "paused") return;

    // final beat before the results screen: everything keeps moving, shooting stops
    if (this.pendingEnd) {
      this.pendingEnd.t -= dtRaw;
      this.timeScale = Math.max(0.35, this.timeScale - dtRaw * 0.8);
      if (this.pendingEnd.t <= 0) {
        const reason = this.pendingEnd.reason;
        this.pendingEnd = null;
        this.timeScale = 1;
        this.endRun(reason);
        return;
      }
    }

    // dog animation
    if (this.dog.active) {
      this.dog.t += dtRaw;
      if (this.dog.t >= this.dog.dur) this.dog.active = false;
    }

    // particles
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dtRaw;
      if (p.life <= 0) {
        this.parts.splice(i, 1);
        continue;
      }
      p.x += p.vx * dtRaw;
      p.y += p.vy * dtRaw;
      p.vy += p.grav * dtRaw;
      if (p.kind === "feather") {
        p.vx *= 0.985;
        p.vy = Math.min(p.vy, 70);
        p.x += Math.sin(p.life * 9) * 22 * dtRaw;
      }
      p.rot += p.vr * dtRaw;
    }
    if (this.parts.length > 420) this.parts.splice(0, this.parts.length - 420);

    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dtRaw;
      f.y += f.vy * dtRaw;
      f.vy *= 0.96;
      if (f.life <= 0) this.floats.splice(i, 1);
    }

    // keyboard aiming
    if (active && !this.usingTouch) {
      const ax =
        (this.keys.has("arrowright") || this.keys.has("d") ? 1 : 0) -
        (this.keys.has("arrowleft") || this.keys.has("a") ? 1 : 0);
      const ay =
        (this.keys.has("arrowdown") || this.keys.has("s") ? 1 : 0) -
        (this.keys.has("arrowup") || this.keys.has("w") ? 1 : 0);
      const sp = 1500;
      this.aimVel.x += ax * sp * dtRaw;
      this.aimVel.y += ay * sp * dtRaw;
      this.aimVel.x *= Math.pow(0.0009, dtRaw);
      this.aimVel.y *= Math.pow(0.0009, dtRaw);
      this.aim.x = clamp(this.aim.x + this.aimVel.x * dtRaw, 6, this.w - 6);
      this.aim.y = clamp(this.aim.y + this.aimVel.y * dtRaw, 6, this.h - 6);
    }

    if (active) {
      this.fireCooldown = Math.max(0, this.fireCooldown - dtRaw);
      if (this.reloadT > 0) {
        this.reloadT -= dtRaw;
        if (this.reloadT <= 0) {
          this.reloadT = 0;
          this.ammo = this.gun.mag;
          audio.click();
        }
      }
      if (this.pointerDown || this.keys.has(" ")) this.tryShoot();
      if (this.comboTimer > 0) {
        this.comboTimer -= dtRaw;
        if (this.comboTimer <= 0) this.combo = 0;
      }

      // LEVEL clock — only this level's timer runs, and only while playing.
      this.levelTimeLeft = Math.max(0, this.levelTimeLeft - dtRaw);
      const secs = Math.ceil(this.levelTimeLeft);
      if (secs !== this.lastBeep && secs <= 5 && secs > 0) {
        this.lastBeep = secs;
        audio.click();
      }
      if (secs <= 5 && this.lastBeep > 5) this.lastBeep = secs;
      // warn kindly before any level can fail
      if (this.levelTimeLeft <= 10 && this.levelTimeLeft > 9.9) {
        this.banner = { text: "10 SECONDS!", sub: `CLEAR ${this.levelGoal - this.levelCleared} MORE BIRDS`, t: 1.8 };
        audio.roundStart();
        audio.shout("Ten seconds! Finish the level!", 0);
      }
      if (this.levelTimeLeft <= 0) {
        this.failLevel("time");
        return;
      }
    }

    // bird spawning
    if (active && this.toSpawn > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnBird();
        this.toSpawn--;
        this.spawnTimer = this.spawnGap * rnd(0.7, 1.3);
      }
    } else if (this.phase === "menu" && this.birds.length < 4 && Math.random() < dtRaw * 0.6) {
      this.spawnBird(true);
    }

    // birds
    const groundY = this.h * 0.82;
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const b = this.birds[i];
      b.t += dt;
      b.flap += b.flapSpeed * dt;
      if (b.state === "fly") {
        b.x += b.vx * dt;
        // birds rise slowly, but they are clamped inside the playfield so they can
        // never float off the top edge and "escape" without ever being shootable
        b.baseY = Math.max(this.h * 0.12, b.baseY - 6 * dt);
        b.y = b.baseY + Math.sin(b.t * 2.1 + b.bobPhase) * b.type.bob;
        b.rot = Math.sin(b.t * 2.1 + b.bobPhase) * 0.18;
        // a bird only counts as "on the field" once it is actually reachable on screen
        if (b.x > 24 && b.x < this.w - 24) b.entered = true;
        const out = b.dir === 1 ? b.x > this.w + 70 : b.x < -70;
        if (out) {
          this.birds.splice(i, 1);
          // Only real, shootable birds that flew away cost an escape and bring out the dog.
          if (this.phase === "playing" && !this.pendingEnd && b.entered && !b.ambient) this.onEscape();
          continue;
        }
        if (b.y < -90) {
          // safety net: a bird that somehow pushed above the sky is removed silently
          this.birds.splice(i, 1);
          continue;
        }
      } else if (b.state === "hit") {
        b.hitT -= dt;
        b.scale = 1 + Math.max(0, b.hitT) * 2.2;
        if (b.hitT <= 0) {
          b.state = "fall";
          b.vy = -60;
          b.scale = 1;
        }
      } else {
        b.vy += 900 * dt;
        b.y += b.vy * dt;
        b.x += b.vx * 0.15 * dt;
        b.rot += b.spin * dt;
        if (b.y > groundY) {
          this.thud(b);
          this.birds.splice(i, 1);
          continue;
        }
      }
    }

    // round complete?
    if (active && this.toSpawn === 0 && this.birds.length === 0) {
      if (this.roundEnd < 0) this.roundEnd = 0.9;
      this.roundEnd -= dtRaw;
      if (this.roundEnd <= 0) this.finishRound();
    }
  }

  private thud(b: Bird) {
    const y = this.h * 0.82;
    this.addShake(6);
    for (let i = 0; i < 10; i++) {
      this.parts.push({
        x: b.x,
        y,
        vx: rnd(-120, 120),
        vy: rnd(-180, -40),
        life: rnd(0.3, 0.7),
        max: 0.7,
        size: rnd(3, 7),
        color: "#d9c9a3",
        kind: "spark",
        rot: 0,
        vr: 0,
        grav: 500,
      });
    }
  }

  /** A bird the player could have shot flew away: costs an escape slot, then the level. */
  private onEscape() {
    if (this.pendingEnd || this.phase !== "playing") return;
    this.roundEscaped++;
    this.escapesLeft = Math.max(0, this.escapesLeft - 1);
    this.combo = 0;
    const taunt = pick(ESCAPE_TAUNTS);
    if (this.dogCooldown <= 0 && !this.dog.active) this.summonDog(true, taunt);
    audio.shout(taunt, 500);
    this.addShake(10);
    this.floats.push({
      x: this.w / 2,
      y: this.h * 0.3,
      vy: -20,
      life: 1.2,
      max: 1.2,
      text: "ESCAPED!",
      color: "#f87171",
      size: 34,
    });
    if (this.escapesLeft <= 1 && !this.warnedOneEscape) {
      this.warnedOneEscape = true;
      this.banner = {
        text: "LAST CHANCE!",
        sub: `1 ESCAPE LEFT · THEN LEVEL ${this.round} FAILS`,
        t: 2,
      };
      audio.shout("One escape left! Focus up!", 0);
    }
    // No instant game over: too many escapees only fail the LEVEL (lives are lost then).
    if (this.escapesLeft <= 0) {
      this.failLevel("escapes");
      return;
    }
    this.emit(true);
  }

  // -------------------------------------------------------------- rendering

  private bakeBackground() {
    const c = this.bgCtx;
    const t = THEMES[this.themeIdx];
    const w = this.w;
    const h = this.h;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, w, h);

    const sky = c.createLinearGradient(0, 0, 0, h * 0.85);
    sky.addColorStop(0, t.sky[0]);
    sky.addColorStop(0.55, t.sky[1]);
    sky.addColorStop(1, t.sky[2]);
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    if (t.stars) {
      c.fillStyle = "rgba(255,255,255,0.9)";
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h * 0.6;
        const r = Math.random() * 1.4 + 0.3;
        c.globalAlpha = 0.3 + Math.random() * 0.7;
        c.beginPath();
        c.arc(x, y, r, 0, 6.3);
        c.fill();
      }
      c.globalAlpha = 1;
    }

    // sun / moon
    const sx = w * 0.76;
    const sy = h * 0.22;
    const grd = c.createRadialGradient(sx, sy, 4, sx, sy, h * 0.3);
    grd.addColorStop(0, t.sun);
    grd.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = grd;
    c.beginPath();
    c.arc(sx, sy, h * 0.3, 0, 6.3);
    c.fill();
    c.fillStyle = t.sun;
    c.beginPath();
    c.arc(sx, sy, h * 0.062, 0, 6.3);
    c.fill();

    const hill = (yBase: number, amp: number, color: string, seedShift: number) => {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(0, h);
      c.lineTo(0, yBase);
      for (let x = 0; x <= w; x += 12) {
        const y =
          yBase -
          Math.sin(x / (w / 3) + seedShift) * amp -
          Math.sin(x / (w / 7) + seedShift * 2) * amp * 0.45;
        c.lineTo(x, y);
      }
      c.lineTo(w, h);
      c.closePath();
      c.fill();
    };

    hill(h * 0.63, h * 0.05, t.hillFar, 0.7);
    hill(h * 0.71, h * 0.045, t.hillMid, 2.1);

    // trees on mid hill
    c.fillStyle = t.tree;
    for (let i = 0; i < 16; i++) {
      const x = (i / 16) * w + rnd(-14, 14);
      const base = h * 0.745 + rnd(-6, 6);
      const hh = rnd(h * 0.04, h * 0.085);
      c.beginPath();
      c.moveTo(x, base);
      c.lineTo(x - hh * 0.32, base);
      c.lineTo(x, base - hh);
      c.lineTo(x + hh * 0.32, base);
      c.closePath();
      c.fill();
      c.fillRect(x - 1.5, base - 2, 3, 8);
    }

    hill(h * 0.8, h * 0.02, t.hillNear, 4.2);

    // ground
    c.fillStyle = t.ground;
    c.fillRect(0, h * 0.82, w, h * 0.18);
    c.fillStyle = t.grass;
    c.beginPath();
    c.moveTo(0, h * 0.86);
    for (let x = 0; x <= w; x += 16) c.lineTo(x, h * 0.86 + Math.sin(x / 40) * 4);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
    c.fill();

    // bushes
    for (let i = 0; i < 9; i++) {
      const x = (i / 9) * w + rnd(0, w / 9);
      const y = h * 0.855 + rnd(-8, 16);
      const r = rnd(20, 44);
      c.fillStyle = t.tree;
      c.globalAlpha = 0.85;
      c.beginPath();
      c.arc(x, y, r, Math.PI, 0);
      c.arc(x + r * 0.7, y, r * 0.7, Math.PI, 0);
      c.arc(x - r * 0.7, y, r * 0.65, Math.PI, 0);
      c.fill();
    }
    c.globalAlpha = 1;
    this.bgDirty = false;
  }

  private render() {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    if (this.bgDirty) this.bakeBackground();

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    let sx = 0;
    let sy = 0;
    if (this.shake > 0 && this.shakeT > 0) {
      const k = this.shake * (this.shakeT / 0.42);
      sx = rnd(-k, k);
      sy = rnd(-k, k);
    }
    ctx.save();
    ctx.translate(sx, sy);

    ctx.drawImage(this.bg, 0, 0, w, h);
    this.drawClouds(ctx);
    this.drawGrass(ctx, false);

    for (const b of this.birds) this.drawBird(ctx, b);
    // NOTE: the dog is never drawn over the playfield — see renderDogCam()
    this.drawGrass(ctx, true);
    this.drawParticles(ctx);
    this.drawFloaters(ctx);

    if (this.phase === "playing" || this.phase === "paused") {
      this.drawTracer(ctx);
      this.drawGunModel(ctx);
      this.drawCrosshair(ctx);
    }
    ctx.restore();

    // vignette + flash
    if (!this.vignette) {
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.45)");
      this.vignette = vg;
    }
    ctx.fillStyle = this.vignette;
    ctx.fillRect(0, 0, w, h);

    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(255,248,220,${this.flash * 0.22})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.banner.t > 0 && this.phase === "playing") this.drawBanner(ctx);
    if (this.combo >= 2 && this.phase === "playing") this.drawCombo(ctx);
  }

  private drawClouds(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = THEMES[this.themeIdx].haze;
    for (const c of this.clouds) {
      const r = 26 * c.s;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, 6.3);
      ctx.arc(c.x + r, c.y + 6, r * 0.8, 0, 6.3);
      ctx.arc(c.x - r, c.y + 8, r * 0.7, 0, 6.3);
      ctx.arc(c.x + r * 0.4, c.y - r * 0.6, r * 0.75, 0, 6.3);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGrass(ctx: CanvasRenderingContext2D, front: boolean) {
    const h = this.h;
    const t = THEMES[this.themeIdx];
    const yBase = front ? h * 0.985 : h * 0.9;
    const len = front ? 44 : 22;
    const time = performance.now() / 1000;
    ctx.save();
    ctx.strokeStyle = front ? t.tree : t.grass;
    ctx.lineWidth = front ? 5 : 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < this.grassSeed.length; i += front ? 1 : 2) {
      const s = this.grassSeed[i];
      const x = i * 9 + s * 6;
      const sway = Math.sin(time * 1.4 + i * 0.6) * (front ? 9 : 5);
      const l = len * (0.6 + s * 0.7);
      ctx.moveTo(x, yBase);
      ctx.quadraticCurveTo(x + sway * 0.5, yBase - l * 0.6, x + sway, yBase - l);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawBird(ctx: CanvasRenderingContext2D, b: Bird) {
    const s = b.type.size;
    const flap = Math.sin(b.flap);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.scale(b.dir * b.scale, b.scale);

    // shadow pass for readability
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(2, 4, s * 0.85, s * 0.58, 0, 0, 6.3);
    ctx.fill();
    ctx.globalAlpha = 1;

    // far wing
    ctx.fillStyle = b.type.wing;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.1);
    ctx.quadraticCurveTo(-s * 0.9, -s * 0.2 - flap * s * 0.8, -s * 1.15, s * 0.35 - flap * s * 0.5);
    ctx.quadraticCurveTo(-s * 0.55, s * 0.05, -s * 0.05, s * 0.12);
    ctx.closePath();
    ctx.fill();

    // tail
    ctx.fillStyle = b.type.wing;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, 0);
    ctx.lineTo(-s * 1.25, -s * 0.28);
    ctx.lineTo(-s * 1.2, s * 0.25);
    ctx.closePath();
    ctx.fill();

    // body
    ctx.fillStyle = b.type.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.82, s * 0.56, 0, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = b.type.belly;
    ctx.beginPath();
    ctx.ellipse(s * 0.05, s * 0.16, s * 0.6, s * 0.34, 0, 0, 6.3);
    ctx.fill();

    // head
    ctx.fillStyle = b.type.body;
    ctx.beginPath();
    ctx.arc(s * 0.72, -s * 0.3, s * 0.38, 0, 6.3);
    ctx.fill();

    // beak
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(s * 1.02, -s * 0.34);
    ctx.lineTo(s * 1.5, -s * 0.2);
    ctx.lineTo(s * 1.0, -s * 0.08);
    ctx.closePath();
    ctx.fill();

    // eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(s * 0.82, -s * 0.4, s * 0.14, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(s * 0.86, -s * 0.4, s * 0.07, 0, 6.3);
    ctx.fill();

    // near wing
    ctx.fillStyle = b.type.body;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.05);
    ctx.quadraticCurveTo(-s * 0.4, -s * 0.9 - flap * s * 1.1, -s * 0.05, -s * 1.15 - flap * s * 0.8);
    ctx.quadraticCurveTo(s * 0.45, -s * 0.5 - flap * s * 0.4, s * 0.25, s * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = b.type.wing;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (b.state === "hit") {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = `rgba(255,255,255,${clamp(b.hitT * 6, 0, 0.9)})`;
      ctx.fillRect(-s * 2, -s * 2, s * 4, s * 4);
      ctx.globalCompositeOperation = "source-over";
    }
    if (b.state === "fall") {
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.moveTo(s * 0.72, -s * 0.46);
      ctx.lineTo(s * 0.94, -s * 0.28);
      ctx.moveTo(s * 0.94, -s * 0.46);
      ctx.lineTo(s * 0.72, -s * 0.28);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.restore();

    if (b.type.id === "golden" && b.state === "fly") {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(performance.now() / 120) * 0.15;
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, s * 1.6, 0, 6.3);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Attach (or detach) the off-playfield "dog cam" canvas. */
  setDogCanvas(canvas: HTMLCanvasElement | null) {
    this.dogCanvas = canvas;
    this.dogCtx = canvas ? canvas.getContext("2d") : null;
    this.measureDogCam();
  }

  /** Re-read the panel size (called from a ResizeObserver, never per frame). */
  measureDogCam() {
    const cv = this.dogCanvas;
    if (!cv) {
      this.dogSize = { w: 0, h: 0 };
      return;
    }
    const rect = cv.getBoundingClientRect();
    const s = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(120, Math.round(rect.width));
    const h = Math.max(64, Math.round(rect.height));
    this.dogScale = s;
    this.dogSize = { w, h };
    cv.width = Math.round(w * s);
    cv.height = Math.round(h * s);
  }

  /**
   * The dog lives entirely OUTSIDE the playfield so it can never hide a target.
   * It is drawn in its own canvas, with its own fence/grass mini-scene.
   */
  private renderDogCam() {
    const cv = this.dogCanvas;
    const c = this.dogCtx;
    if (!cv || !c) return;
    if (this.dogSize.w === 0) this.measureDogCam();
    const w = this.dogSize.w;
    const h = this.dogSize.h;
    if (w === 0) return;
    c.setTransform(this.dogScale, 0, 0, this.dogScale, 0, 0);
    c.clearRect(0, 0, w, h);

    const now = performance.now() / 1000;
    const d = this.dog;
    const p = d.active ? clamp(d.t / d.dur, 0, 1) : 0;
    // rise (0 = peeking behind the fence, 1 = fully up) -> hold -> sink
    let k: number;
    if (!d.active) k = 0;
    else if (p < 0.2) k = clamp(this.easeOutBack(p / 0.2) * 0.95 + 0.05, 0, 1.1);
    else if (p > 0.82) k = clamp(1 - (p - 0.82) / 0.18, 0, 1);
    else k = 1;

    const landscape = w > h * 1.3;
    const s = landscape ? clamp(h / 150, 0.4, 0.95) : clamp(Math.min(w, h * 0.7) / 150, 0.36, 1);
    const idlePeek = 0.34;
    const up01 = idlePeek + (1 - idlePeek) * clamp(k, 0, 1);
    const bobIdle = d.active ? 0 : Math.sin(now * 1.6) * 3 * s;
    const headX = landscape ? w * 0.28 : w * 0.5;
    const idleY = h - 26 * s + bobIdle;
    const topY = Math.max(56 * s, h * (landscape ? 0.62 : 0.34));
    const headY = idleY + (topY - idleY) * up01;
    const shake = d.active ? Math.sin(d.t * 18) * 6 * s * (p > 0.18 && p < 0.84 ? 1 : 0) : 0;

    // ---- mini scene: dusk sky, fence, grass
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#1d2547");
    sky.addColorStop(0.55, "#3b3a63");
    sky.addColorStop(1, "#4b4463");
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 26; i++) {
      const sx = ((i * 97) % w) + Math.sin(now * 0.4 + i) * 2;
      const sy = ((i * 53) % Math.max(1, h * 0.5)) + 4;
      c.globalAlpha = 0.25 + ((i * 37) % 10) / 18;
      c.beginPath();
      c.arc(sx, sy, 1.2, 0, 6.3);
      c.fill();
    }
    c.globalAlpha = 1;
    // moon
    c.fillStyle = "rgba(255,244,214,0.85)";
    c.beginPath();
    c.arc(w - 20 * s - 8, 16 * s + 8, 9 * s, 0, 6.3);
    c.fill();
    // back fence
    const fy = h - 30 * s;
    c.fillStyle = "#5b3a22";
    c.fillRect(0, fy - 26 * s, w, 7 * s);
    c.fillRect(0, fy - 8 * s, w, 7 * s);
    for (let x = -6 * s; x < w + 20 * s; x += 30 * s) {
      c.fillStyle = Math.round(x / (30 * s)) % 2 === 0 ? "#7b4f2d" : "#6b4426";
      c.fillRect(x, fy - 34 * s, 15 * s, 48 * s);
    }

    // dog glow when active
    if (d.active) {
      const g = c.createRadialGradient(headX, headY, 4, headX, headY, w * 0.6);
      g.addColorStop(0, d.big ? "rgba(251,113,133,0.45)" : "rgba(253,224,71,0.35)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }

    this.drawDogHead(c, headX, headY + shake, s, d.active, d.t, d.big);

    // foreground grass band — the dog genuinely rises up from behind it
    const gh = Math.max(18, h * 0.2);
    const topWobble = (x: number) => Math.sin(x / (14 * s) + now * 0.8) * 3 * s;
    c.fillStyle = "#1b2a18";
    c.beginPath();
    c.moveTo(0, h);
    c.lineTo(0, h - gh + topWobble(0));
    for (let x = 0; x <= w; x += 5) c.lineTo(x, h - gh + topWobble(x));
    c.lineTo(w, h);
    c.closePath();
    c.fill();
    c.strokeStyle = "#2f4a28";
    c.lineWidth = 2.4 * s;
    c.lineCap = "round";
    c.beginPath();
    for (let x = 2; x < w; x += 7 * s) {
      const bh = (14 + ((x * 13) % 11)) * s;
      const base = h - gh + topWobble(x) + 3 * s;
      c.moveTo(x, base);
      c.quadraticCurveTo(x + 4 * s, base - bh * 0.6, x + (x % 2 ? 8 : -8) * s, base - bh);
    }
    c.stroke();

    // speech bubble — always inside the dog panel, never over the hunt
    if (d.active && k > 0.55) {
      const label = d.big ? "HA HA HA!" : "HA HA!";
      const fs = clamp(Math.min(w * 0.13, h * 0.26), 11, 26);
      c.font = `900 ${fs}px system-ui, sans-serif`;
      const tw = c.measureText(label).width;
      const bw = tw + fs * 1.2;
      const bh = fs * 1.7;
      let bx: number;
      let by: number;
      if (landscape) {
        bx = Math.min(w - bw - 6, headX + 46 * s);
        by = Math.max(6, h - bh - 8);
      } else {
        bx = clamp(headX - bw / 2, 6, w - bw - 6);
        by = Math.max(6, headY - 62 * s - bh);
      }
      c.save();
      c.translate(bx + bw / 2, by + bh / 2);
      c.rotate(Math.sin(now * 12) * 0.05);
      c.fillStyle = "#fffdf5";
      c.strokeStyle = "#20140a";
      c.lineWidth = Math.max(2, fs * 0.16);
      c.beginPath();
      c.roundRect(-bw / 2, -bh / 2, bw, bh, Math.min(14, bh / 2));
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(-bw * 0.32, bh / 2 - 2);
      c.lineTo(-bw * 0.44, bh / 2 + fs * 0.62);
      c.lineTo(-bw * 0.1, bh / 2 - 1);
      c.closePath();
      c.fill();
      c.fillStyle = "#20140a";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(label, 0, fs * 0.08);
      c.restore();
    }

    if (d.active && d.big) {
      c.save();
      c.strokeStyle = "rgba(244,63,94,0.75)";
      c.lineWidth = 5;
      c.strokeRect(3, 3, w - 6, h - 6);
      c.restore();
    }
  }

  private drawDogHead(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    s: number,
    laughing: boolean,
    t: number,
    big: boolean,
  ) {
    const now = performance.now() / 1000;
    const mouth = 0.5 + Math.sin(t * 18) * 0.5;
    c.save();
    c.translate(x, y);
    c.scale(s, s);

    // chest / paws
    c.fillStyle = "#c9873f";
    c.beginPath();
    c.ellipse(0, 96, 76, 70, 0, 0, 6.3);
    c.fill();
    c.fillStyle = "#f5e2c0";
    c.beginPath();
    c.ellipse(0, 112, 46, 48, 0, 0, 6.3);
    c.fill();
    const paw = laughing ? Math.sin(t * 18) * 10 : 0;
    c.fillStyle = "#c9873f";
    c.beginPath();
    c.ellipse(-70, 60 + paw, 24, 18, -0.5, 0, 6.3);
    c.fill();
    c.beginPath();
    c.ellipse(70, 60 - paw, 24, 18, 0.5, 0, 6.3);
    c.fill();

    // ears
    c.fillStyle = "#8a5426";
    const earFlop = laughing ? Math.sin(t * 14) * 0.12 : 0;
    c.beginPath();
    c.ellipse(-76, 6, 24, 54, 0.25 + earFlop, 0, 6.3);
    c.fill();
    c.beginPath();
    c.ellipse(76, 6, 24, 54, -0.25 - earFlop, 0, 6.3);
    c.fill();

    // head
    c.fillStyle = "#d8944a";
    c.beginPath();
    c.ellipse(0, 0, 86, 74, 0, 0, 6.3);
    c.fill();
    // snout
    c.fillStyle = "#f3dcb6";
    c.beginPath();
    c.ellipse(0, 26, 54, 40, 0, 0, 6.3);
    c.fill();

    const blink = !laughing && Math.sin(now * 1.4) > 0.96;

    if (laughing) {
      // ^ ^ laughing eyes
      c.strokeStyle = "#20140a";
      c.lineWidth = 7;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(-46, -20);
      c.lineTo(-30, -34);
      c.lineTo(-14, -20);
      c.moveTo(14, -20);
      c.lineTo(30, -34);
      c.lineTo(46, -20);
      c.stroke();
      // open mouth
      c.fillStyle = "#3b0d10";
      c.beginPath();
      c.ellipse(0, 40 + mouth * 6, 34, 16 + mouth * 20, 0, 0, 6.3);
      c.fill();
      c.fillStyle = "#f2708a";
      c.beginPath();
      c.ellipse(0, 52 + mouth * 20, 20, 10 + mouth * 8, 0, 0, 6.3);
      c.fill();
    } else {
      // alert, watching eyes that track the hunt
      const look = Math.sin(now * 0.7) * 5;
      if (blink) {
        c.strokeStyle = "#20140a";
        c.lineWidth = 6;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(-48, -18);
        c.lineTo(-14, -18);
        c.moveTo(14, -18);
        c.lineTo(48, -18);
        c.stroke();
      } else {
        c.fillStyle = "#fff";
        c.beginPath();
        c.ellipse(-30, -20, 20, 21, 0, 0, 6.3);
        c.fill();
        c.beginPath();
        c.ellipse(30, -20, 20, 21, 0, 0, 6.3);
        c.fill();
        c.fillStyle = "#20140a";
        c.beginPath();
        c.arc(-30 + look, -20, 10, 0, 6.3);
        c.fill();
        c.beginPath();
        c.arc(30 + look, -20, 10, 0, 6.3);
        c.fill();
      }
      // closed, smug mouth + tongue
      c.strokeStyle = "#20140a";
      c.lineWidth = 5;
      c.lineCap = "round";
      c.beginPath();
      c.arc(0, 34, 22, 0.25 * Math.PI, 0.75 * Math.PI);
      c.stroke();
      c.fillStyle = "#f2708a";
      c.beginPath();
      c.ellipse(10, 58, 12, 16, 0.1, 0, 6.3);
      c.fill();
    }

    // nose
    c.fillStyle = "#20140a";
    c.beginPath();
    c.ellipse(0, 6, 16, 12, 0, 0, 6.3);
    c.fill();

    // sunglasses-style bravado for the big taunt
    if (big && laughing) {
      c.fillStyle = "#fbbf24";
      c.font = "900 26px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText("★", 0, -104);
    }
    c.restore();
  }

  private easeOutBack(x: number) {
    const c1 = 1.9;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }



  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.parts) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.kind === "feather") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.42, 0, 0, 6.3);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.stroke();
      } else if (p.kind === "smoke") {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (2 - a), 0, 6.3);
        ctx.fill();
      } else if (p.kind === "ring") {
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 3 * a;
        ctx.beginPath();
        ctx.arc(0, 0, p.size + (1 - a) * 60, 0, 6.3);
        ctx.stroke();
      } else if (p.kind === "star") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
          ctx.lineTo(Math.cos(ang) * p.size, Math.sin(ang) * p.size);
          const ang2 = ang + Math.PI / 5;
          ctx.lineTo(Math.cos(ang2) * p.size * 0.45, Math.sin(ang2) * p.size * 0.45);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  private drawFloaters(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of this.floats) {
      const a = clamp(f.life / f.max, 0, 1);
      const pop = 1 + (1 - a) * 0.25;
      ctx.globalAlpha = a;
      ctx.font = `900 ${f.size * pop}px system-ui, -apple-system, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  private drawTracer(ctx: CanvasRenderingContext2D) {
    if (this.gunKick <= 0.01) return;
    const mx = this.w * 0.82;
    const my = this.h + 10;
    ctx.save();
    ctx.globalAlpha = this.gunKick * 0.8;
    const grad = ctx.createLinearGradient(mx, my, this.aim.x, this.aim.y);
    grad.addColorStop(0, "rgba(255,230,150,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mx, my - 60);
    ctx.lineTo(this.aim.x, this.aim.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawGunModel(ctx: CanvasRenderingContext2D) {
    const kick = this.gunKick;
    const bx = this.w * 0.82;
    const by = this.h + 26 + kick * 26;
    const ang = -0.5 + kick * 0.22;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(ang);
    const g = this.gun;
    // stock
    ctx.fillStyle = "#3b2418";
    ctx.beginPath();
    ctx.roundRect(-18, 10, 46, 96, 10);
    ctx.fill();
    // body
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.roundRect(-14, -96, 34, 120, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.roundRect(-14, -96, 12, 120, 8);
    ctx.fill();
    // barrel tip highlight
    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.roundRect(-10, -106, 26, 16, 5);
    ctx.fill();
    if (kick > 0.05) {
      ctx.globalAlpha = kick;
      ctx.fillStyle = "#fff3b0";
      ctx.beginPath();
      ctx.moveTo(3, -140);
      ctx.lineTo(-24, -100);
      ctx.lineTo(30, -100);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(3, -106, 12 * kick, 0, 6.3);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D) {
    const { x, y } = this.aim;
    const kick = this.recoil;
    const r = 18 + kick + (this.gun.pellets > 1 ? this.gun.spread * 0.22 : 0);
    ctx.save();
    ctx.translate(x, y - kick * 0.4);
    ctx.rotate(performance.now() / 2600);
    ctx.strokeStyle = this.ammo > 0 ? "rgba(255,255,255,0.95)" : "rgba(248,113,113,0.95)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 6.3);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 3.5, 0, 6.3);
    ctx.stroke();
    ctx.rotate(-performance.now() / 2600);

    ctx.strokeStyle = this.ammo > 0 ? "#fff" : "#f87171";
    ctx.lineWidth = 2.5;
    const gap = 7;
    ctx.beginPath();
    ctx.moveTo(-r - 10, 0);
    ctx.lineTo(-gap, 0);
    ctx.moveTo(gap, 0);
    ctx.lineTo(r + 10, 0);
    ctx.moveTo(0, -r - 10);
    ctx.lineTo(0, -gap);
    ctx.moveTo(0, gap);
    ctx.lineTo(0, r + 10);
    ctx.stroke();
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, 6.3);
    ctx.fill();

    if (this.reloadT > 0) {
      const p = 1 - this.reloadT / this.gun.reloadTime;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, r + 14, -Math.PI / 2, -Math.PI / 2 + p * 6.283);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBanner(ctx: CanvasRenderingContext2D) {
    const t = this.banner.t;
    const a = clamp(t > 1.4 ? (1.8 - t) / 0.4 : t / 0.6, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const y = this.h * 0.3;
    ctx.font = `900 ${Math.min(72, this.w * 0.09)}px system-ui, sans-serif`;
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.strokeText(this.banner.text, this.w / 2, y);
    ctx.fillStyle = "#fde047";
    ctx.fillText(this.banner.text, this.w / 2, y);
    ctx.font = `800 ${Math.min(30, this.w * 0.04)}px system-ui, sans-serif`;
    ctx.strokeText(this.banner.sub, this.w / 2, y + 52);
    ctx.fillStyle = "#fff";
    ctx.fillText(this.banner.sub, this.w / 2, y + 52);
    ctx.restore();
  }

  private drawCombo(ctx: CanvasRenderingContext2D) {
    const mult = Math.min(1 + this.combo * 0.12, 4);
    const pulse = 1 + Math.sin(performance.now() / 90) * 0.04;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(this.w / 2, this.h * 0.12);
    ctx.scale(pulse, pulse);
    ctx.font = "900 34px system-ui, sans-serif";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.strokeText(`${this.combo} STREAK  x${mult.toFixed(2)}`, 0, 0);
    ctx.fillStyle = "#fb7185";
    ctx.fillText(`${this.combo} STREAK  x${mult.toFixed(2)}`, 0, 0);
    // combo timer bar
    const wBar = 190;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(-wBar / 2, 24, wBar, 7);
    ctx.fillStyle = "#fb7185";
    ctx.fillRect(-wBar / 2, 24, (wBar * clamp(this.comboTimer / 3, 0, 1)), 7);
    ctx.restore();
  }

  // -------------------------------------------------------------- state out

  private emit(force = false) {
    const s: Snapshot = {
      phase: this.phase,
      score: this.score,
      coins: this.coins,
      round: this.round,
      lives: this.lives,
      maxLives: this.maxLives,
      ammo: this.ammo,
      mag: this.gun.mag,
      reloading: this.reloadT > 0,
      combo: this.combo,
      multiplier: Math.min(1 + this.combo * 0.12, 4),
      birdsLeft: this.toSpawn + this.birds.filter((b) => b.state === "fly").length,
      gunId: this.gun.id,
      owned: this.owned,
      roundHits: this.roundHits,
      roundShots: this.roundShots,
      roundEscaped: this.roundEscaped,
      roundBonus: this.roundBonus,
      accuracy: this.roundShots ? Math.round((this.roundHits / this.roundShots) * 100) : 0,
      muted: audio.muted,
      duration: this.duration,
      levelsTotal: this.levelsTotal,
      levelTimeLeft: Math.round(this.levelTimeLeft * 10) / 10,
      levelTime: this.levelTime,
      levelGoal: this.levelGoal,
      levelCleared: this.levelCleared,
      escapesLeft: this.escapesLeft,
      retry: this.retry,
      endReason: this.endReason,
      prevBest: this.prevBest,
      totalHits: this.totalHits,
      perfectRound: this.perfectRound,
      dogActive: this.dog.active,
      dogBig: this.dog.big,
      dogText: this.dog.active ? this.dogText : "",
    };
    const key = JSON.stringify(s);
    if (!force && key === this.lastSnap) return;
    this.lastSnap = key;
    this.onState(s);
  }
}
