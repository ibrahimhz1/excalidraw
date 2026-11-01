import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ApiError } from "../../cloud/api";

interface SaveAsDialogProps {
  open: boolean;
  defaultName: string;
  onCancel: () => void;
  onSave: (name: string) => Promise<void>;
}

export const SaveAsDialog = (props: SaveAsDialogProps) => {
  const { open, defaultName, onCancel } = props;
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(defaultName);
    setError(null);
    setBusy(false);

    const frame = inputRef.current?.ownerDocument.defaultView?.requestAnimationFrame(
      () => inputRef.current?.select(),
    );

    return () => {
      if (frame !== undefined) {
        inputRef.current?.ownerDocument.defaultView?.cancelAnimationFrame(
          frame,
        );
      }
    };
  }, [open, defaultName]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();

    if (!trimmed || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await props.onSave(trimmed);
    } catch (saveError) {
      setError(
        saveError instanceof ApiError || saveError instanceof Error
          ? saveError.message
          : "Could not save the diagram",
      );
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="cloud-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <div
        className="cloud-modal cloud-modal--save-as"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-save-as-title"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) {
            event.stopPropagation();
            onCancel();
          }
        }}
      >
        <header className="cloud-modal__header">
          <h2 id="cloud-save-as-title">Save as new diagram</h2>
          <button
            type="button"
            className="cloud-icon-button"
            aria-label="Close"
            disabled={busy}
            onClick={onCancel}
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="cloud-modal__body">
            <label className="cloud-field">
              <span>Diagram name</span>
              <input
                ref={inputRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                disabled={busy}
              />
            </label>
            {error ? <p className="cloud-modal__error">{error}</p> : null}
          </div>

          <div className="cloud-modal__actions">
            <button
              type="button"
              className="cloud-button"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cloud-button cloud-button--primary"
              disabled={busy || !name.trim()}
            >
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
