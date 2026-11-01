import type { CloudDiagram } from "./api";

export type LibrarySort = "updated" | "created" | "name";

export type LibraryView = "grid" | "list";

const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;
const week = 7 * day;
const month = 30 * day;
const year = 365 * day;

export function filterDiagrams(
  diagrams: CloudDiagram[],
  query: string,
): CloudDiagram[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return diagrams;
  }

  return diagrams.filter((diagram) =>
    diagram.name.toLowerCase().includes(normalized),
  );
}

export function sortDiagrams(
  diagrams: CloudDiagram[],
  sort: LibrarySort,
): CloudDiagram[] {
  const sorted = [...diagrams];

  switch (sort) {
    case "created":
      return sorted.sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
    case "name":
      return sorted.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    case "updated":
    default:
      return sorted.sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      );
  }
}

function plural(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const timestamp = Date.parse(iso);

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const elapsed = Math.max(0, now - timestamp);

  if (elapsed < minute) {
    return "just now";
  }

  if (elapsed < hour) {
    return plural(Math.floor(elapsed / minute), "minute");
  }

  if (elapsed < day) {
    return plural(Math.floor(elapsed / hour), "hour");
  }

  if (elapsed < week) {
    return plural(Math.floor(elapsed / day), "day");
  }

  if (elapsed < month) {
    return plural(Math.floor(elapsed / week), "week");
  }

  if (elapsed < year) {
    return plural(Math.floor(elapsed / month), "month");
  }

  return plural(Math.floor(elapsed / year), "year");
}
