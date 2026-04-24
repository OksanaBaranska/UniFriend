import { passesFilters, filterCandidates } from "../utils/filterCandidates";
import { Filters, UserProfile } from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: "user-1",
    email: "student@mytum.de",
    name: "Anna",
    university: "TUM",
    semester: 3,
    major: "Computer Science",
    gender: "Female",
    interests: ["hiking", "chess"],
    status: "Looking to study together",
    photos: ["https://example.com/photo.jpg"],
    prompts: [],
    showTo: [],
    createdAt: 1000000,
    ...overrides,
  };
}

function makeFilters(overrides: Partial<Filters> = {}): Filters {
  return {
    genders: [],
    interests: [],
    semesterRange: [1, 20],
    programFilter: "any",
    ...overrides,
  };
}

const ME = makeUser({ uid: "me", name: "Oksana", gender: "Female", major: "Computer Science" });

// ─── passesFilters ───────────────────────────────────────────────────────────

describe("passesFilters — required fields", () => {
  test("passes a fully complete profile", () => {
    expect(passesFilters(makeUser(), ME, makeFilters())).toBe(true);
  });

  test("rejects a profile with no name", () => {
    expect(passesFilters(makeUser({ name: "" }), ME, makeFilters())).toBe(false);
  });

  test("rejects a profile with no photos", () => {
    expect(passesFilters(makeUser({ photos: [] }), ME, makeFilters())).toBe(false);
  });

  test("rejects a profile with no major", () => {
    expect(passesFilters(makeUser({ major: "" }), ME, makeFilters())).toBe(false);
  });

  test("rejects a profile with no semester", () => {
    expect(passesFilters(makeUser({ semester: 0 }), ME, makeFilters())).toBe(false);
  });
});

// ─── Semester range ──────────────────────────────────────────────────────────

describe("passesFilters — semester range", () => {
  test("passes when semester is exactly at minimum", () => {
    const f = makeFilters({ semesterRange: [3, 6] });
    expect(passesFilters(makeUser({ semester: 3 }), ME, f)).toBe(true);
  });

  test("passes when semester is exactly at maximum", () => {
    const f = makeFilters({ semesterRange: [3, 6] });
    expect(passesFilters(makeUser({ semester: 6 }), ME, f)).toBe(true);
  });

  test("rejects when semester is below minimum", () => {
    const f = makeFilters({ semesterRange: [3, 6] });
    expect(passesFilters(makeUser({ semester: 2 }), ME, f)).toBe(false);
  });

  test("rejects when semester is above maximum", () => {
    const f = makeFilters({ semesterRange: [3, 6] });
    expect(passesFilters(makeUser({ semester: 7 }), ME, f)).toBe(false);
  });

  test("passes any semester when range is 1–20 (default)", () => {
    const f = makeFilters({ semesterRange: [1, 20] });
    expect(passesFilters(makeUser({ semester: 1 }), ME, f)).toBe(true);
    expect(passesFilters(makeUser({ semester: 10 }), ME, f)).toBe(true);
    expect(passesFilters(makeUser({ semester: 20 }), ME, f)).toBe(true);
  });
});

// ─── Gender filter ───────────────────────────────────────────────────────────

describe("passesFilters — gender filter", () => {
  test("passes any gender when filter is empty", () => {
    const f = makeFilters({ genders: [] });
    expect(passesFilters(makeUser({ gender: "Male" }), ME, f)).toBe(true);
    expect(passesFilters(makeUser({ gender: "Non-binary" }), ME, f)).toBe(true);
  });

  test("passes when candidate gender matches filter", () => {
    const f = makeFilters({ genders: ["Male"] });
    expect(passesFilters(makeUser({ gender: "Male" }), ME, f)).toBe(true);
  });

  test("rejects when candidate gender does not match filter", () => {
    const f = makeFilters({ genders: ["Male"] });
    expect(passesFilters(makeUser({ gender: "Female" }), ME, f)).toBe(false);
  });

  test("passes when candidate gender is one of multiple allowed genders", () => {
    const f = makeFilters({ genders: ["Male", "Non-binary"] });
    expect(passesFilters(makeUser({ gender: "Non-binary" }), ME, f)).toBe(true);
    expect(passesFilters(makeUser({ gender: "Female" }), ME, f)).toBe(false);
  });
});

// ─── Programme filter ────────────────────────────────────────────────────────

describe("passesFilters — programme filter", () => {
  test("any: passes different major", () => {
    const f = makeFilters({ programFilter: "any" });
    expect(passesFilters(makeUser({ major: "Physics" }), ME, f)).toBe(true);
  });

  test("sameProgram: passes matching major", () => {
    const f = makeFilters({ programFilter: "sameProgram" });
    const me = makeUser({ uid: "me", major: "Computer Science" });
    expect(passesFilters(makeUser({ major: "Computer Science" }), me, f)).toBe(true);
  });

  test("sameProgram: rejects different major", () => {
    const f = makeFilters({ programFilter: "sameProgram" });
    const me = makeUser({ uid: "me", major: "Computer Science" });
    expect(passesFilters(makeUser({ major: "Physics" }), me, f)).toBe(false);
  });

  test("sameLehrstuhl: passes same department (Informatics)", () => {
    const f = makeFilters({ programFilter: "sameLehrstuhl" });
    const me = makeUser({ uid: "me", major: "Computer Science" });
    // Artificial Intelligence → also Informatics dept
    expect(passesFilters(makeUser({ major: "Artificial Intelligence" }), me, f)).toBe(true);
  });

  test("sameLehrstuhl: rejects different department", () => {
    const f = makeFilters({ programFilter: "sameLehrstuhl" });
    const me = makeUser({ uid: "me", major: "Computer Science" });
    // Physics → Natural Sciences, not Informatics
    expect(passesFilters(makeUser({ major: "Physics" }), me, f)).toBe(false);
  });

  test("sameLehrstuhl: rejects when candidate major has no department mapping", () => {
    const f = makeFilters({ programFilter: "sameLehrstuhl" });
    const me = makeUser({ uid: "me", major: "Computer Science" });
    expect(passesFilters(makeUser({ major: "Some Unknown Major" }), me, f)).toBe(false);
  });

  test("sameLehrstuhl: rejects when my own major has no department mapping", () => {
    const f = makeFilters({ programFilter: "sameLehrstuhl" });
    const me = makeUser({ uid: "me", major: "Some Unknown Major" });
    expect(passesFilters(makeUser({ major: "Computer Science" }), me, f)).toBe(false);
  });
});

// ─── Interests filter ────────────────────────────────────────────────────────

describe("passesFilters — interests filter", () => {
  test("passes any interests when filter is empty", () => {
    const f = makeFilters({ interests: [] });
    expect(passesFilters(makeUser({ interests: [] }), ME, f)).toBe(true);
  });

  test("passes when candidate shares at least one interest", () => {
    const f = makeFilters({ interests: ["chess"] });
    expect(passesFilters(makeUser({ interests: ["chess", "running"] }), ME, f)).toBe(true);
  });

  test("rejects when candidate shares no interests", () => {
    const f = makeFilters({ interests: ["chess"] });
    expect(passesFilters(makeUser({ interests: ["cooking", "running"] }), ME, f)).toBe(false);
  });

  test("interest matching is case-insensitive", () => {
    const f = makeFilters({ interests: ["Chess"] });
    expect(passesFilters(makeUser({ interests: ["chess"] }), ME, f)).toBe(true);
  });

  test("rejects when candidate has no interests at all", () => {
    const f = makeFilters({ interests: ["chess"] });
    expect(passesFilters(makeUser({ interests: [] }), ME, f)).toBe(false);
  });
});

// ─── showTo (visibility preference) ─────────────────────────────────────────

describe("passesFilters — showTo visibility", () => {
  test("shows to everyone when showTo is empty", () => {
    const f = makeFilters();
    const me = makeUser({ uid: "me", gender: "Male" });
    expect(passesFilters(makeUser({ showTo: [] }), me, f)).toBe(true);
  });

  test("shows when my gender is in candidate's showTo list", () => {
    const f = makeFilters();
    const me = makeUser({ uid: "me", gender: "Female" });
    expect(passesFilters(makeUser({ showTo: ["Female", "Non-binary"] }), me, f)).toBe(true);
  });

  test("hides when my gender is NOT in candidate's showTo list", () => {
    const f = makeFilters();
    const me = makeUser({ uid: "me", gender: "Male" });
    expect(passesFilters(makeUser({ showTo: ["Female"] }), me, f)).toBe(false);
  });

  test("shows to everyone when my own gender is empty string", () => {
    const f = makeFilters();
    const me = makeUser({ uid: "me", gender: "" });
    // candidate only wants Female — but we don't know my gender, so show
    expect(passesFilters(makeUser({ showTo: ["Female"] }), me, f)).toBe(true);
  });
});

// ─── filterCandidates (full list) ───────────────────────────────────────────

describe("filterCandidates", () => {
  const me = makeUser({ uid: "me", gender: "Female", major: "Computer Science", semester: 4 });
  const f = makeFilters();

  test("excludes the current user from results", () => {
    const pool = [me, makeUser({ uid: "other" })];
    const result = filterCandidates(pool, me, f, new Set());
    expect(result.find((p) => p.uid === "me")).toBeUndefined();
  });

  test("excludes already-seen UIDs", () => {
    const seen = new Set(["user-1"]);
    const pool = [makeUser({ uid: "user-1" }), makeUser({ uid: "user-2" })];
    const result = filterCandidates(pool, me, f, seen);
    expect(result.map((p) => p.uid)).toEqual(["user-2"]);
  });

  test("returns empty array when everyone is filtered out", () => {
    const f2 = makeFilters({ genders: ["Male"] });
    const pool = [makeUser({ gender: "Female" }), makeUser({ gender: "Non-binary" })];
    expect(filterCandidates(pool, me, f2, new Set())).toHaveLength(0);
  });

  test("returns all valid candidates when no filters are active", () => {
    const pool = [
      makeUser({ uid: "a" }),
      makeUser({ uid: "b" }),
      makeUser({ uid: "c" }),
    ];
    const result = filterCandidates(pool, me, f, new Set());
    expect(result).toHaveLength(3);
  });

  test("applies multiple filters simultaneously", () => {
    const strictFilters = makeFilters({
      genders: ["Male"],
      semesterRange: [2, 4],
      interests: ["chess"],
    });
    const pool = [
      makeUser({ uid: "a", gender: "Male", semester: 3, interests: ["chess"] }),   // ✓
      makeUser({ uid: "b", gender: "Male", semester: 3, interests: ["cooking"] }), // ✗ wrong interest
      makeUser({ uid: "c", gender: "Female", semester: 3, interests: ["chess"] }), // ✗ wrong gender
      makeUser({ uid: "d", gender: "Male", semester: 8, interests: ["chess"] }),   // ✗ wrong semester
    ];
    const result = filterCandidates(pool, me, strictFilters, new Set());
    expect(result.map((p) => p.uid)).toEqual(["a"]);
  });

  test("does not mutate the input array", () => {
    const pool = [makeUser({ uid: "x" }), makeUser({ uid: "y" })];
    const original = [...pool];
    filterCandidates(pool, me, f, new Set());
    expect(pool).toEqual(original);
  });
});
