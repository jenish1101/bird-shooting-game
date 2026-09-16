export type GunSoundKind = "pistol" | "revolver" | "shotgun" | "smg" | "cannon";

export interface Gun {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  mag: number;
  /** seconds between shots */
  fireDelay: number;
  reloadTime: number;
  /** pellets per trigger pull */
  pellets: number;
  /** pellet spread radius in px */
  spread: number;
  /** forgiveness radius added to bird hitbox */
  aimAssist: number;
  recoil: number;
  shake: number;
  scoreMul: number;
  sound: GunSoundKind;
  blurb: string;
  color: string;
}

export const GUNS: Gun[] = [
  {
    id: "pistol",
    name: "Rusty Pistol",
    emoji: "🔫",
    cost: 0,
    mag: 6,
    fireDelay: 0.22,
    reloadTime: 0.85,
    pellets: 1,
    spread: 0,
    aimAssist: 17,
    recoil: 6,
    shake: 7,
    scoreMul: 1,
    sound: "pistol",
    blurb: "Standard issue. Gets the job done, barely.",
    color: "#a3a3a3",
  },
  {
    id: "revolver",
    name: "Hawk .44",
    emoji: "🪅",
    cost: 900,
    mag: 6,
    fireDelay: 0.3,
    reloadTime: 1.0,
    pellets: 1,
    spread: 0,
    aimAssist: 22,
    recoil: 11,
    shake: 12,
    scoreMul: 1.4,
    sound: "revolver",
    blurb: "Heavy hitter with a wide, forgiving bite.",
    color: "#f59e0b",
  },
  {
    id: "shotgun",
    name: "Boom Stick",
    emoji: "💥",
    cost: 1800,
    mag: 4,
    fireDelay: 0.5,
    reloadTime: 1.3,
    pellets: 7,
    spread: 62,
    aimAssist: 16,
    recoil: 16,
    shake: 18,
    scoreMul: 1.2,
    sound: "shotgun",
    blurb: "Seven pellets. Feathers everywhere. No apologies.",
    color: "#ef4444",
  },
  {
    id: "smg",
    name: "Sparrow SMG",
    emoji: "⚡",
    cost: 3200,
    mag: 22,
    fireDelay: 0.085,
    reloadTime: 1.1,
    pellets: 1,
    spread: 14,
    aimAssist: 14,
    recoil: 4,
    shake: 5,
    scoreMul: 1.1,
    sound: "smg",
    blurb: "Hold the trigger. Ask questions never.",
    color: "#38bdf8",
  },
  {
    id: "cannon",
    name: "Golden Cannon",
    emoji: "🏆",
    cost: 6500,
    mag: 3,
    fireDelay: 0.55,
    reloadTime: 1.4,
    pellets: 1,
    spread: 0,
    aimAssist: 58,
    recoil: 20,
    shake: 26,
    scoreMul: 2.2,
    sound: "cannon",
    blurb: "Blast radius so big the birds apologise first.",
    color: "#fbbf24",
  },
];

export const getGun = (id: string): Gun => GUNS.find((g) => g.id === id) ?? GUNS[0];
