// Tiny WebAudio synth + male "shouter" announcer via speechSynthesis.

type Ctx = AudioContext;

export class AudioKit {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  muted = false;
  private voice: SpeechSynthesisVoice | null = null;
  private lastSpeak = 0;
  private noiseBuf: AudioBuffer | null = null;

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);

    // noise buffer for gunshots / wings
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this.pickVoice();
  }

  private pickVoice() {
    if (typeof speechSynthesis === "undefined") return;
    const choose = () => {
      const voices = speechSynthesis.getVoices();
      if (!voices.length) return;
      const prefer = [
        "google uk english male",
        "google us english",
        "daniel",
        "alex",
        "fred",
        "microsoft david",
        "microsoft guy",
        "male",
      ];
      let best: SpeechSynthesisVoice | null = null;
      for (const p of prefer) {
        const found = voices.find((v) => v.name.toLowerCase().includes(p));
        if (found) {
          best = found;
          break;
        }
      }
      this.voice = best ?? voices.find((v) => v.lang.startsWith("en")) ?? voices[0];
    };
    choose();
    speechSynthesis.onvoiceschanged = choose;
  }

  /** Male announcer shout. Rate limited so it never becomes noise soup. */
  shout(text: string, minGapMs = 700) {
    if (this.muted || typeof speechSynthesis === "undefined") return;
    const now = performance.now();
    if (now - this.lastSpeak < minGapMs) return;
    this.lastSpeak = now;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) u.voice = this.voice;
      u.pitch = 0.55;
      u.rate = 1.08;
      u.volume = 1;
      speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }

  stopSpeech() {
    if (typeof speechSynthesis !== "undefined") {
      try {
        speechSynthesis.cancel();
      } catch {
        /* noop */
      }
    }
  }

  private now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private noise(dur: number, gain: number, filterFreq: number, q = 1, type: BiquadFilterType = "lowpass") {
    if (!this.ctx || !this.master || !this.noiseBuf || this.muted) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private tone(
    freq: number,
    dur: number,
    gain = 0.25,
    type: OscillatorType = "square",
    slideTo?: number,
    delay = 0,
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.now() + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  shot(kind: "pistol" | "revolver" | "shotgun" | "smg" | "cannon" = "pistol") {
    this.init();
    switch (kind) {
      case "shotgun":
        this.noise(0.32, 0.9, 1600);
        this.tone(140, 0.22, 0.35, "sawtooth", 40);
        break;
      case "smg":
        this.noise(0.1, 0.5, 3200);
        this.tone(320, 0.07, 0.2, "square", 120);
        break;
      case "cannon":
        this.noise(0.5, 1.0, 900);
        this.tone(90, 0.45, 0.45, "sawtooth", 30);
        break;
      case "revolver":
        this.noise(0.24, 0.8, 2400);
        this.tone(220, 0.14, 0.3, "square", 60);
        break;
      default:
        this.noise(0.16, 0.6, 2800);
        this.tone(260, 0.1, 0.22, "square", 80);
    }
  }

  hit() {
    this.tone(880, 0.08, 0.25, "square");
    this.tone(1320, 0.1, 0.18, "square", 1760, 0.04);
    this.noise(0.12, 0.25, 900);
  }

  squawk() {
    this.tone(700 + Math.random() * 300, 0.12, 0.12, "sawtooth", 300);
  }

  coin() {
    this.tone(1046, 0.07, 0.2, "square");
    this.tone(1568, 0.14, 0.18, "square", undefined, 0.06);
  }

  click() {
    this.tone(420, 0.05, 0.14, "square", 300);
  }

  emptyClick() {
    this.noise(0.05, 0.3, 5000, 1, "highpass");
    this.tone(120, 0.05, 0.12, "square");
  }

  reload() {
    this.noise(0.07, 0.25, 4000, 1, "highpass");
    this.tone(200, 0.06, 0.1, "square", 400, 0.12);
    this.tone(320, 0.08, 0.12, "square", 180, 0.26);
  }

  /** cartoon dog laugh: bouncy descending blips */
  laugh() {
    this.init();
    const base = 520;
    for (let i = 0; i < 5; i++) {
      this.tone(base - i * 42, 0.1, 0.2, "triangle", base - i * 42 - 120, i * 0.13);
      this.tone((base - i * 42) * 1.5, 0.08, 0.08, "square", undefined, i * 0.13);
    }
  }

  roundStart() {
    this.tone(523, 0.1, 0.2, "square");
    this.tone(659, 0.1, 0.2, "square", undefined, 0.1);
    this.tone(784, 0.18, 0.22, "square", undefined, 0.2);
  }

  gameOver() {
    this.tone(392, 0.2, 0.25, "sawtooth");
    this.tone(330, 0.2, 0.25, "sawtooth", undefined, 0.18);
    this.tone(262, 0.45, 0.28, "sawtooth", 130, 0.36);
  }
}

export const audio = new AudioKit();
