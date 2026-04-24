import { getDepartmentForMajor } from "../firebase/universities";
import { Filters, UserProfile } from "../types";

/**
 * Returns true if a candidate profile passes all active filters
 * and should be shown to the current user.
 *
 * Pure function — no Firebase, no side-effects. Easily unit-testable.
 */
export function passesFilters(
  candidate: UserProfile,
  me: UserProfile,
  filters: Filters
): boolean {
  // Must have minimum required fields to appear in swipe deck
  if (!candidate.name || !candidate.photos?.[0] || !candidate.major || !candidate.semester) {
    return false;
  }

  // Semester range
  const [minSem, maxSem] = filters.semesterRange;
  if (candidate.semester < minSem || candidate.semester > maxSem) return false;

  // Gender filter (empty = any)
  if (filters.genders.length > 0 && !filters.genders.includes(candidate.gender)) return false;

  // Study programme filter
  if (filters.programFilter === "sameProgram" && candidate.major !== me.major) return false;
  if (filters.programFilter === "sameLehrstuhl") {
    const myDept = getDepartmentForMajor(me.major);
    const theirDept = getDepartmentForMajor(candidate.major);
    if (!myDept || !theirDept || myDept !== theirDept) return false;
  }

  // Interests overlap (empty filter = any)
  if (filters.interests.length > 0) {
    const candidateInterestsLower = (candidate.interests ?? []).map((x) => x.toLowerCase());
    const overlap = filters.interests.some((i) =>
      candidateInterestsLower.includes(i.toLowerCase())
    );
    if (!overlap) return false;
  }

  // Candidate's showTo visibility preference (empty = show to everyone)
  if (
    candidate.showTo &&
    candidate.showTo.length > 0 &&
    me.gender &&
    !candidate.showTo.includes(me.gender)
  ) {
    return false;
  }

  return true;
}

/**
 * Filters a list of raw candidates down to those the current user should see.
 * Excludes already-seen UIDs and the user themselves.
 */
export function filterCandidates(
  candidates: UserProfile[],
  me: UserProfile,
  filters: Filters,
  seenUids: Set<string>
): UserProfile[] {
  return candidates.filter((p) => {
    if (seenUids.has(p.uid)) return false;
    if (p.uid === me.uid) return false;
    return passesFilters(p, me, filters);
  });
}
