import { describe, expect, it } from "vitest";

import {
  filterDiagrams,
  formatRelativeTime,
  sortDiagrams,
} from "../cloud/library";

import type { CloudDiagram } from "../cloud/api";

function diagram(overrides: Partial<CloudDiagram> = {}): CloudDiagram {
  return {
    id: "id-1",
    name: "Diagram",
    description: null,
    ownerId: "owner",
    folderId: null,
    googleDriveFileId: "file",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("filterDiagrams", () => {
  it("returns every diagram for an empty query", () => {
    const items = [diagram({ id: "a" }), diagram({ id: "b" })];

    expect(filterDiagrams(items, "   ")).toEqual(items);
  });

  it("matches names case-insensitively and ignores surrounding spaces", () => {
    const items = [
      diagram({ id: "a", name: "Architecture" }),
      diagram({ id: "b", name: "Flowchart" }),
    ];

    expect(filterDiagrams(items, " ARCH ").map((item) => item.id)).toEqual([
      "a",
    ]);
  });
});

describe("sortDiagrams", () => {
  it("sorts by most recently updated by default", () => {
    const items = [
      diagram({ id: "old", updatedAt: "2026-01-01T00:00:00.000Z" }),
      diagram({ id: "new", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ];

    expect(sortDiagrams(items, "updated").map((item) => item.id)).toEqual([
      "new",
      "old",
    ]);
  });

  it("sorts by created date descending", () => {
    const items = [
      diagram({ id: "old", createdAt: "2025-01-01T00:00:00.000Z" }),
      diagram({ id: "new", createdAt: "2026-01-01T00:00:00.000Z" }),
    ];

    expect(sortDiagrams(items, "created").map((item) => item.id)).toEqual([
      "new",
      "old",
    ]);
  });

  it("sorts names alphabetically and leaves the input untouched", () => {
    const items = [
      diagram({ id: "b", name: "beta" }),
      diagram({ id: "a", name: "Alpha" }),
    ];

    expect(sortDiagrams(items, "name").map((item) => item.id)).toEqual([
      "a",
      "b",
    ]);
    expect(items.map((item) => item.id)).toEqual(["b", "a"]);
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-01-10T12:00:00.000Z");

  it("formats recent times", () => {
    expect(formatRelativeTime("2026-01-10T11:59:30.000Z", now)).toBe(
      "just now",
    );
    expect(formatRelativeTime("2026-01-10T11:59:00.000Z", now)).toBe(
      "1 minute ago",
    );
    expect(formatRelativeTime("2026-01-10T11:55:00.000Z", now)).toBe(
      "5 minutes ago",
    );
  });

  it("formats hours, days, weeks, months, and years", () => {
    expect(formatRelativeTime("2026-01-10T10:00:00.000Z", now)).toBe(
      "2 hours ago",
    );
    expect(formatRelativeTime("2026-01-07T12:00:00.000Z", now)).toBe(
      "3 days ago",
    );
    expect(formatRelativeTime("2025-12-27T12:00:00.000Z", now)).toBe(
      "2 weeks ago",
    );
    expect(formatRelativeTime("2025-11-10T12:00:00.000Z", now)).toBe(
      "2 months ago",
    );
    expect(formatRelativeTime("2024-01-10T12:00:00.000Z", now)).toBe(
      "2 years ago",
    );
  });

  it("returns an empty string for invalid dates", () => {
    expect(formatRelativeTime("not-a-date", now)).toBe("");
  });
});
