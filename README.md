# UniFriend

**A friendship app for university students.** UniFriend helps students meet people at their own university. It uses the familiar swipe mechanic, but for friendship, not dating.

<img src="docs/screenshot.png" alt="UniFriend swipe screen" width="280" align="right" />

> **Status: in progress.** The core loop (sign-up → profile → swipe → match → chat) works on iOS. Email verification and push notifications are being finished.

## Why

University is full of people, yet many students stay strangers, especially in lectures with hundreds of others. Social media is passive and group chats are transactional. UniFriend makes it easy to find people at your university who share your interests.

## Features

- **Personality-first profiles:** photos, a short status, interests, "vibe" answers (e.g. *hangout vibe*, *I show up as…*) and photo-prompt pairs
- **University-only matching:** you only see students from your own university, detected from your university email domain (e.g. `mytum.de` → TUM)
- **Filters:** semester range, gender, interests, same study program or same department
- **Visibility control:** choose who your profile is shown to
- **Swipe deck:** shared interests are highlighted on every card
- **Matches & chat:** a mutual like creates a match and unlocks a real-time chat
- **Email verification:** a 6-digit code, stored hashed, valid for 10 minutes, max. 5 attempts *(in progress)*
- **Push notifications** for new matches and messages *(in progress)*

<br clear="right" />

## Tech stack

| Area | Technology |
| --- | --- |
| App | React Native, Expo, TypeScript |
| Navigation | React Navigation (stack + bottom tabs) |
| Backend | Firebase Authentication, Cloud Firestore, Firebase Storage |
| Server logic | Firebase Cloud Functions (Node.js), Resend for emails |
| Notifications | Expo Notifications |
| Tests | Jest (`jest-expo`) |

## Project structure

```
src/
├── screens/        # 11 screens: login, sign-up, verify email, create profile,
│                   # filters, swipe, matches, chat, profile, view profile, privacy policy
├── navigation/     # app navigator: auth flow + main tabs (Swipe, Matches, Profile)
├── firebase/       # Firebase setup, universities & majors, email verification, notifications
├── utils/          # filterCandidates: matching/filter logic (pure function, unit-tested)
├── components/     # reusable UI components
├── constants/      # colors, interests, vibe options
├── types/          # shared types: UserProfile, Filters, Match, Message
└── __tests__/      # Jest unit tests
functions/          # Cloud Functions: send and verify email codes
```

## How it was built

I built UniFriend with **Claude Code** as my coding tool. My part was the product side and directing the implementation:

- **Concept:** defined the problem, target group, core features and what belongs in a first version
- **UX/UI design:** collected references in mood boards and iterated on the profile card layout many times before settling on a clean, iOS-style design
- **User flow:** planned the full flow from sign-up to chat and the rules for matching and filtering
- **Implementation:** guided Claude Code feature by feature, reviewed the results and asked for changes
- **Testing:** tested the app on a real iPhone and added unit tests for the filter logic

## Running it locally

Requirements: Node.js 20+, the Expo Go app or an iOS simulator, and your own Firebase project.

```bash
git clone https://github.com/<your-username>/UniFriend.git
cd UniFriend
npm install
```

The Firebase config is not included in this repo. Create `src/firebase/config.ts` from the example file and add the keys from your own Firebase project:

```bash
cp src/firebase/config.example.ts src/firebase/config.ts
```

Then start the app and run the tests:

```bash
npx expo start
npm test
```

## Next steps

- Finish email verification and push notifications
- First test release with students at TUM, then collect feedback
- GDPR review before a public launch

---

Made by Oksana Baranska · Information Systems student at TUM
