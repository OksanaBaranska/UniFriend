export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  university: string;
  semester: number;
  major: string;
  gender: string;
  interests: string[];
  status: string;
  bio?: string; // legacy field, use status
  vibes?: import("../constants/vibes").Vibes;
  photos: string[];
  prompts: { question: string; answer: string }[];
  showTo: string[];  // genders to show profile to, empty = everyone
  createdAt: number;
  lastLoginAt?: number;
}

export interface Filters {
  genders: string[];        // empty = any
  interests: string[];      // empty = any
  semesterRange: [number, number];
  programFilter: "any" | "sameProgram" | "sameLehrstuhl";
}

export interface Match {
  matchId: string;
  users: [string, string];
  createdAt: number;
}

export interface Message {
  id: string;
  fromUid: string;
  text: string;
  createdAt: number;
  readBy: string[];
}

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  CreateProfile: undefined;
  SetFilters: undefined;
  Main: undefined;
  EditFilters: undefined;
  Chat: { matchId: string; otherUserName: string };
};

export type MainTabParamList = {
  Swipe: undefined;
  Matches: undefined;
  Profile: undefined;
};
