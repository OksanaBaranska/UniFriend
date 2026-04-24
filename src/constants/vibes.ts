export interface VibeCategory {
  key: keyof Vibes;
  label: string;
  question: string;
  options: string[];
}

export interface Vibes {
  hangout?: string;
  lifeFeelsLike?: string;
  showUpAs?: string;
}

export const VIBE_CATEGORIES: VibeCategory[] = [
  {
    key: "hangout",
    label: "Hangout vibe",
    question: "What kind of hangout are you usually down for?",
    options: [
      "☕ Coffee & Talk",
      "📚 Study Together",
      "🎵 Music & Vibes",
      "🏃 Move & Hang",
      "🎮 Game Nights",
      "🌍 Explore the City",
      "🍕 Food Adventures",
      "🧘 Chill & Recharge",
      "🎉 Going Out",
    ],
  },
  {
    key: "lifeFeelsLike",
    label: "Life right now feels like",
    question: "If your life right now were a movie, it'd be...",
    options: [
      "🎬 Indie coming-of-age",
      "😂 Chaotic comedy",
      "🌙 Quiet character study",
      "🚀 Unexpected adventure",
      "💭 Overthinking montage",
      "☀️ Feel-good slice of life",
    ],
  },
  {
    key: "showUpAs",
    label: "I show up as",
    question: "In a group of friends, you're usually...",
    options: [
      "The one who brings snacks",
      "The one who suggests new places",
      "The one who listens",
      "The one who makes the playlist",
      "The one who's always 5 min late",
      "The one who plans everything",
    ],
  },
];
