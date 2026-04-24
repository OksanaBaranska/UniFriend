import {
  getUniversityName,
  getMajorsForUniversity,
  getDepartmentForMajor,
} from "../firebase/universities";

// ─── getUniversityName ───────────────────────────────────────────────────────

describe("getUniversityName", () => {
  test("returns TUM for @mytum.de address", () => {
    expect(getUniversityName("student@mytum.de")).toBe("TUM");
  });

  test("returns TUM for @tum.de address", () => {
    expect(getUniversityName("student@tum.de")).toBe("TUM");
  });

  test("returns LMU Munich for @lmu.de", () => {
    expect(getUniversityName("max@lmu.de")).toBe("LMU Munich");
  });

  test("returns LMU Munich for @campus.lmu.de", () => {
    expect(getUniversityName("max@campus.lmu.de")).toBe("LMU Munich");
  });

  test("returns KIT for @kit.edu", () => {
    expect(getUniversityName("anna@kit.edu")).toBe("KIT");
  });

  test("returns RWTH Aachen for @rwth-aachen.de", () => {
    expect(getUniversityName("hans@rwth-aachen.de")).toBe("RWTH Aachen");
  });

  test("falls back to uppercased domain prefix for unknown universities", () => {
    expect(getUniversityName("student@uni-passau.de")).toBe("UNI-PASSAU");
  });

  test("returns empty string when email has no @ symbol", () => {
    expect(getUniversityName("notanemail")).toBe("");
  });

  test("is case-insensitive for the domain part", () => {
    expect(getUniversityName("student@MYTUM.DE")).toBe("TUM");
  });
});

// ─── getMajorsForUniversity ──────────────────────────────────────────────────

describe("getMajorsForUniversity", () => {
  test("returns TUM-specific majors for TUM", () => {
    const majors = getMajorsForUniversity("TUM");
    expect(majors).toContain("Wirtschaftsinformatik");
    expect(majors).toContain("Computer Science");
    expect(majors).toContain("Artificial Intelligence");
  });

  test("returns default majors for an unknown university", () => {
    const majors = getMajorsForUniversity("University of Nowhere");
    expect(majors.length).toBeGreaterThan(0);
    expect(majors).toContain("Computer Science");
  });

  test("returns an array, never null or undefined", () => {
    expect(getMajorsForUniversity("TUM")).toBeTruthy();
    expect(getMajorsForUniversity("SomeRandomUni")).toBeTruthy();
  });

  test("TUM list does not contain duplicates", () => {
    const majors = getMajorsForUniversity("TUM");
    const unique = new Set(majors);
    expect(unique.size).toBe(majors.length);
  });
});

// ─── getDepartmentForMajor ───────────────────────────────────────────────────

describe("getDepartmentForMajor", () => {
  test("Computer Science → Informatics", () => {
    expect(getDepartmentForMajor("Computer Science")).toBe("Informatics");
  });

  test("Artificial Intelligence → Informatics", () => {
    expect(getDepartmentForMajor("Artificial Intelligence")).toBe("Informatics");
  });

  test("Mechanical Engineering → Engineering & Design", () => {
    expect(getDepartmentForMajor("Mechanical Engineering")).toBe("Engineering & Design");
  });

  test("Physics → Natural Sciences", () => {
    expect(getDepartmentForMajor("Physics")).toBe("Natural Sciences");
  });

  test("Wirtschaftsinformatik → Management", () => {
    expect(getDepartmentForMajor("Wirtschaftsinformatik")).toBe("Management");
  });

  test("Medicine → Medicine & Health", () => {
    expect(getDepartmentForMajor("Medicine")).toBe("Medicine & Health");
  });

  test("returns null for an unmapped major", () => {
    expect(getDepartmentForMajor("Ancient Greek Philosophy")).toBeNull();
  });

  test("returns null for an empty string", () => {
    expect(getDepartmentForMajor("")).toBeNull();
  });

  test("sameLehrstuhl grouping: CS and Games Engineering share a department", () => {
    expect(getDepartmentForMajor("Computer Science")).toBe(
      getDepartmentForMajor("Games Engineering")
    );
  });

  test("sameLehrstuhl grouping: CS and Physics do NOT share a department", () => {
    expect(getDepartmentForMajor("Computer Science")).not.toBe(
      getDepartmentForMajor("Physics")
    );
  });
});
