import React from "react";

import { gridIcon, searchIcon } from "@excalidraw/excalidraw/components/icons";

import type { LibrarySort, LibraryView } from "../../cloud/library";

interface LibraryToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  sort: LibrarySort;
  onSortChange: (sort: LibrarySort) => void;
  view: LibraryView;
  onViewChange: (view: LibraryView) => void;
  count: number;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

const listIcon = (
  <svg
    aria-hidden="true"
    focusable="false"
    role="img"
    viewBox="0 0 24 24"
    width="16"
    height="16"
  >
    <g
      strokeWidth="1.5"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h3" />
      <path d="M4 12h3" />
      <path d="M4 18h3" />
      <path d="M10 6h10" />
      <path d="M10 12h10" />
      <path d="M10 18h10" />
    </g>
  </svg>
);

export const LibraryToolbar = (props: LibraryToolbarProps) => {
  return (
    <div className="cloud-toolbar">
      <label className="cloud-toolbar__search">
        <span className="cloud-toolbar__search-icon" aria-hidden="true">
          {searchIcon}
        </span>
        <input
          ref={props.searchInputRef}
          type="search"
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder="Search diagrams"
          aria-label="Search diagrams"
        />
        <span className="cloud-toolbar__shortcut" aria-hidden="true">
          /
        </span>
      </label>

      <label className="cloud-toolbar__sort">
        <span className="cloud-toolbar__label">Sort</span>
        <select
          value={props.sort}
          onChange={(event) =>
            props.onSortChange(event.target.value as LibrarySort)
          }
          aria-label="Sort diagrams"
        >
          <option value="updated">Last modified</option>
          <option value="created">Date created</option>
          <option value="name">Name A-Z</option>
        </select>
      </label>

      <div
        className="cloud-toolbar__view"
        role="group"
        aria-label="Diagram view"
      >
        <button
          type="button"
          className={
            props.view === "grid"
              ? "cloud-toolbar__view-option is-active"
              : "cloud-toolbar__view-option"
          }
          aria-pressed={props.view === "grid"}
          onClick={() => props.onViewChange("grid")}
        >
          <span aria-hidden="true">{gridIcon}</span>
          Grid
        </button>
        <button
          type="button"
          className={
            props.view === "list"
              ? "cloud-toolbar__view-option is-active"
              : "cloud-toolbar__view-option"
          }
          aria-pressed={props.view === "list"}
          onClick={() => props.onViewChange("list")}
        >
          <span aria-hidden="true">{listIcon}</span>
          List
        </button>
      </div>

      <span className="cloud-toolbar__count">
        {props.count} {props.count === 1 ? "diagram" : "diagrams"}
      </span>
    </div>
  );
};
