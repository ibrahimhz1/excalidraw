import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  ApiError,
  deleteDiagram,
  listDiagrams,
  renameDiagram,
  type AuthUser,
  type CloudDiagram,
} from "../cloud/api";

import "./CloudDialogs.scss";

interface CloudDialogsProps {
  open: boolean;
  user: AuthUser | null;
  currentDiagramId: string | null;
  defaultName: string;
  onClose: () => void;
  onLogin: () => void;
  onOpen: (id: string) => Promise<void>;
  onDeleted: (id: string) => void;
  onRenamed: (diagram: CloudDiagram) => void;
  onSaveAs: (name: string) => Promise<void>;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Request failed";
}

export const CloudDialogs = (props: CloudDialogsProps) => {
  const { open, user, defaultName, onClose } = props;

  const [diagrams, setDiagrams] = useState<CloudDiagram[]>([]);
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const loadDiagrams = useCallback(async () => {
    const items = await listDiagrams();
    setDiagrams(items);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(defaultName);
    setError(null);

    if (!user) {
      setDiagrams([]);
      return;
    }

    let cancelled = false;
    setBusy(true);

    loadDiagrams()
      .catch((loadError) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, user, defaultName, loadDiagrams]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleSaveAs = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await props.onSaveAs(trimmedName);
      await loadDiagrams();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async (id: string) => {
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
  };

  const startRename = (diagram: CloudDiagram) => {
    setRenamingId(diagram.id);
    setRenameValue(diagram.name);
    setError(null);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const handleRename = async (
    event: React.FormEvent,
    diagram: CloudDiagram,
  ) => {
    event.preventDefault();
    const trimmedName = renameValue.trim();

    if (!trimmedName) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const updated = await renameDiagram(diagram.id, trimmedName);
      setDiagrams((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      props.onRenamed(updated);
      cancelRename();
    } catch (renameError) {
      setError(errorMessage(renameError));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (diagram: CloudDiagram) => {
    if (
      !window.confirm(
        `Delete "${diagram.name}"? This deletes the Google Drive file too.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await deleteDiagram(diagram.id);
      setDiagrams((current) =>
        current.filter((item) => item.id !== diagram.id),
      );
      props.onDeleted(diagram.id);
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  };

  if (!props.open) {
    return null;
  }

  return createPortal(
    <div
      className="cloud-dialog__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          props.onClose();
        }
      }}
    >
      <div
        className="cloud-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="My diagrams"
      >
        <header className="cloud-dialog__header">
          <h2>My Diagrams</h2>
          <button
            type="button"
            className="cloud-dialog__icon-button"
            aria-label="Close"
            onClick={props.onClose}
          >
            ×
          </button>
        </header>

        {!props.user ? (
          <div className="cloud-dialog__empty">
            <p>Sign in with Google to save diagrams to your Drive.</p>
            <button
              type="button"
              className="cloud-dialog__primary"
              onClick={props.onLogin}
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <>
            <form className="cloud-dialog__save" onSubmit={handleSaveAs}>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Diagram name"
                maxLength={200}
                disabled={busy}
              />
              <button
                type="submit"
                className="cloud-dialog__primary"
                disabled={busy || !name.trim()}
              >
                Save current as new
              </button>
            </form>

            {error && <p className="cloud-dialog__error">{error}</p>}

            {busy && diagrams.length === 0 ? (
              <p className="cloud-dialog__empty">Loading…</p>
            ) : diagrams.length === 0 ? (
              <p className="cloud-dialog__empty">No diagrams yet.</p>
            ) : (
              <ul className="cloud-dialog__list">
                {diagrams.map((diagram) => (
                  <li
                    key={diagram.id}
                    data-diagram-id={diagram.id}
                    className={
                      diagram.id === props.currentDiagramId
                        ? "cloud-dialog__item is-current"
                        : "cloud-dialog__item"
                    }
                  >
                    <div className="cloud-dialog__item-copy">
                      {renamingId === diagram.id ? (
                        <form
                          className="cloud-dialog__rename"
                          onSubmit={(event) => handleRename(event, diagram)}
                        >
                          <input
                            value={renameValue}
                            onChange={(event) =>
                              setRenameValue(event.target.value)
                            }
                            maxLength={200}
                            autoFocus
                            disabled={busy}
                          />
                          <button
                            type="submit"
                            disabled={busy || !renameValue.trim()}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={cancelRename}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <strong>{diagram.name}</strong>
                          <span>
                            Updated{" "}
                            {new Date(diagram.updatedAt).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                    {renamingId !== diagram.id && (
                      <div className="cloud-dialog__item-actions">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => startRename(diagram)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleOpen(diagram.id)}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className="cloud-dialog__danger"
                          disabled={busy}
                          onClick={() => handleDelete(diagram)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};
