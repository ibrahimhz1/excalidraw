import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { CloseIcon, PlusIcon } from "@excalidraw/excalidraw/components/icons";

import { deleteDiagram, listDiagrams, renameDiagram } from "../../cloud/api";
import { filterDiagrams, sortDiagrams } from "../../cloud/library";
import { clearScenePreviewCache } from "../../cloud/previews";

import { ConfirmDialog } from "./ConfirmDialog";
import { DiagramCard } from "./DiagramCard";
import { DiagramRow } from "./DiagramRow";
import { LibraryToolbar } from "./LibraryToolbar";

import "./CloudLibrary.scss";

import type { AuthUser, CloudDiagram } from "../../cloud/api";
import type { LibrarySort, LibraryView } from "../../cloud/library";

const viewStorageKey = "draw-diagrams.library-view";

interface CloudLibraryProps {
  open: boolean;
  user: AuthUser | null;
  currentDiagramId: string | null;
  onClose: () => void;
  onLogin: () => void;
  onNew: () => boolean;
  onOpen: (id: string) => Promise<void>;
  onDeleted: (id: string) => void;
  onRenamed: (diagram: CloudDiagram) => void;
}

function readStoredView(): LibraryView {
  try {
    return window.localStorage.getItem(viewStorageKey) === "list"
      ? "list"
      : "grid";
  } catch {
    return "grid";
  }
}

function storeView(view: LibraryView): void {
  try {
    window.localStorage.setItem(viewStorageKey, view);
  } catch {
    // storage unavailable; view still works in memory
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed";
}

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export const CloudLibrary = (props: CloudLibraryProps) => {
  const { open, user, currentDiagramId } = props;
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [diagrams, setDiagrams] = useState<CloudDiagram[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LibrarySort>("updated");
  const [view, setView] = useState<LibraryView>(readStoredView);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CloudDiagram | null>(null);
  const [busy, setBusy] = useState(false);

  const loadDiagrams = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const items = await listDiagrams();
      setDiagrams(items);
      setStatus("ready");
    } catch (loadError) {
      setError(errorMessage(loadError));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!open) {
      clearScenePreviewCache();
      return;
    }

    setQuery("");
    setRenamingId(null);
    setDeleteTarget(null);
    setError(null);

    if (user) {
      setStatus("loading");
    } else {
      setDiagrams([]);
      setStatus("ready");
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!user) {
      setDiagrams([]);
      setStatus("ready");
      return;
    }

    void loadDiagrams();
  }, [open, user, loadDiagrams]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const node = dialogRef.current;
    const ownerDocument = node?.ownerDocument;

    if (!node || !ownerDocument) {
      return;
    }

    const previousOverflow = ownerDocument.body.style.overflow;
    ownerDocument.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (deleteTarget) {
        return;
      }

      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const target = event.target as HTMLElement | null;
        const isTyping =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.tagName === "SELECT" ||
          target?.isContentEditable;

        if (!isTyping) {
          event.preventDefault();
          searchInputRef.current?.focus();
        }
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = Array.from(
        node.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null);

      if (items.length === 0) {
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && ownerDocument.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && ownerDocument.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    ownerDocument.addEventListener("keydown", handleKeyDown);

    return () => {
      ownerDocument.removeEventListener("keydown", handleKeyDown);
      ownerDocument.body.style.overflow = previousOverflow;
    };
  }, [open, deleteTarget]);

  const changeView = useCallback((nextView: LibraryView) => {
    setView(nextView);
    storeView(nextView);
  }, []);

  const handleOpen = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);

      try {
        await props.onOpen(id);
        props.onClose();
      } catch (openError) {
        setError(errorMessage(openError));
      } finally {
        setBusy(false);
      }
    },
    [props],
  );

  const handleRename = useCallback(
    async (diagram: CloudDiagram, name: string) => {
      setBusy(true);
      setError(null);

      try {
        const updated = await renameDiagram(diagram.id, name);
        setDiagrams((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setRenamingId(null);
        props.onRenamed(updated);
      } catch (renameError) {
        setError(errorMessage(renameError));
      } finally {
        setBusy(false);
      }
    },
    [props],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await deleteDiagram(deleteTarget.id);
      setDiagrams((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      props.onDeleted(deleteTarget.id);
      setDeleteTarget(null);
    } catch (deleteError) {
      setDeleteTarget(null);
      setError(errorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  }, [deleteTarget, props]);

  const visibleDiagrams = useMemo(
    () => sortDiagrams(filterDiagrams(diagrams, query), sort),
    [diagrams, query, sort],
  );

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="cloud-library__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          props.onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="cloud-library"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-library-title"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !deleteTarget) {
            event.stopPropagation();
            props.onClose();
          }
        }}
      >
        <header className="cloud-library__header">
          <div>
            <span className="cloud-library__eyebrow">Library</span>
            <div className="cloud-library__title-row">
              <h2 id="cloud-library-title">My Diagrams</h2>
              {user ? (
                <span className="cloud-library__count">{diagrams.length}</span>
              ) : null}
            </div>
          </div>

          <div className="cloud-library__actions">
            {user ? (
              <button
                type="button"
                className="cloud-button cloud-button--primary"
                disabled={busy}
                onClick={() => {
                  if (props.onNew()) {
                    props.onClose();
                  }
                }}
              >
                <span aria-hidden="true">{PlusIcon}</span>
                New diagram
              </button>
            ) : null}
            <button
              type="button"
              className="cloud-icon-button cloud-library__close"
              aria-label="Close library"
              disabled={busy}
              onClick={props.onClose}
            >
              {CloseIcon}
            </button>
          </div>
        </header>

        {user ? (
          <LibraryToolbar
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            view={view}
            onViewChange={changeView}
            count={visibleDiagrams.length}
            searchInputRef={searchInputRef}
          />
        ) : null}

        <div className="cloud-library__body" aria-live="polite">
          {error ? (
            <div className="cloud-library__banner" role="alert">
              <span>{error}</span>
              <div className="cloud-library__banner-actions">
                {status === "error" ? (
                  <button
                    type="button"
                    className="cloud-button cloud-button--small"
                    onClick={() => void loadDiagrams()}
                  >
                    Retry
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cloud-button cloud-button--small"
                    onClick={() => setError(null)}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {!user ? (
            <div className="cloud-library__empty">
              <span className="cloud-library__empty-icon" aria-hidden="true">
                {PlusIcon}
              </span>
              <h3>Sign in to save diagrams</h3>
              <p>
                Connect Google Drive to keep your diagrams synced across
                devices.
              </p>
              <button
                type="button"
                className="cloud-button cloud-button--primary"
                onClick={props.onLogin}
              >
                Sign in with Google
              </button>
            </div>
          ) : status === "loading" ? (
            <div
              className={
                view === "grid"
                  ? "cloud-library__grid cloud-library__grid--skeleton"
                  : "cloud-library__list"
              }
              aria-label="Loading diagrams"
            >
              {Array.from({ length: view === "grid" ? 8 : 6 }).map((_, index) =>
                view === "grid" ? (
                  <span
                    key={index}
                    className="cloud-skeleton cloud-skeleton--card"
                  />
                ) : (
                  <span
                    key={index}
                    className="cloud-skeleton cloud-skeleton--row"
                  />
                ),
              )}
            </div>
          ) : visibleDiagrams.length === 0 ? (
            <div className="cloud-library__empty">
              <span className="cloud-library__empty-icon" aria-hidden="true">
                {PlusIcon}
              </span>
              <h3>{query ? "No matching diagrams" : "No diagrams yet"}</h3>
              <p>
                {query
                  ? `Nothing matches "${query}".`
                  : "Create your first diagram to see it here."}
              </p>
              {query ? (
                <button
                  type="button"
                  className="cloud-button"
                  onClick={() => setQuery("")}
                >
                  Clear search
                </button>
              ) : null}
            </div>
          ) : view === "grid" ? (
            <div className="cloud-library__grid">
              {visibleDiagrams.map((diagram) => (
                <DiagramCard
                  key={diagram.id}
                  diagram={diagram}
                  isCurrent={diagram.id === currentDiagramId}
                  isRenaming={renamingId === diagram.id}
                  busy={busy}
                  onOpen={() => void handleOpen(diagram.id)}
                  onStartRename={() => setRenamingId(diagram.id)}
                  onCancelRename={() => setRenamingId(null)}
                  onRename={(name) => void handleRename(diagram, name)}
                  onDelete={() => setDeleteTarget(diagram)}
                />
              ))}
            </div>
          ) : (
            <div className="cloud-library__list">
              {visibleDiagrams.map((diagram) => (
                <DiagramRow
                  key={diagram.id}
                  diagram={diagram}
                  isCurrent={diagram.id === currentDiagramId}
                  isRenaming={renamingId === diagram.id}
                  busy={busy}
                  onOpen={() => void handleOpen(diagram.id)}
                  onStartRename={() => setRenamingId(diagram.id)}
                  onCancelRename={() => setRenamingId(null)}
                  onRename={(name) => void handleRename(diagram, name)}
                  onDelete={() => setDeleteTarget(diagram)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete diagram?"
        message={
          <>
            <strong>{deleteTarget?.name}</strong> will be removed from your
            account and its Google Drive file will be deleted. This cannot be
            undone.
          </>
        }
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>,
    document.body,
  );
};
