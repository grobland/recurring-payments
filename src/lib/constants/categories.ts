export const DEFAULT_CATEGORIES = [
  {
    name: "Streaming",
    slug: "streaming",
    icon: "play-circle",
    color: "#E50914",
    sortOrder: 1,
  },
  {
    name: "Software/SaaS",
    slug: "software",
    icon: "code",
    color: "#0066FF",
    sortOrder: 2,
  },
  {
    name: "Gaming",
    slug: "gaming",
    icon: "gamepad-2",
    color: "#9146FF",
    sortOrder: 3,
  },
  {
    name: "Music",
    slug: "music",
    icon: "music",
    color: "#1DB954",
    sortOrder: 4,
  },
  {
    name: "News",
    slug: "news",
    icon: "newspaper",
    color: "#1A1A1A",
    sortOrder: 5,
  },
  {
    name: "Health/Fitness",
    slug: "health",
    icon: "heart-pulse",
    color: "#FF6B6B",
    sortOrder: 6,
  },
  {
    name: "Cloud Storage",
    slug: "cloud",
    icon: "cloud",
    color: "#4285F4",
    sortOrder: 7,
  },
  {
    name: "Finance",
    slug: "finance",
    icon: "wallet",
    color: "#00C853",
    sortOrder: 8,
  },
  {
    name: "Utilities",
    slug: "utilities",
    icon: "zap",
    color: "#FFC107",
    sortOrder: 9,
  },
  {
    name: "Other",
    slug: "other",
    icon: "circle-dot",
    color: "#9E9E9E",
    sortOrder: 10,
  },
] as const;

export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number];
