import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SaveAsDialogProps {
  open: boolean;
  defaultName: string;
  onCancel: () => void;
  onSave: (name: string) => Promise<void>;
}

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export const SaveAsDialog = (props: SaveAsDialogProps) => {
  const { open, defaultName, onCancel } = props;
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const defaultNameRef = useRef(defaultName);

  useEffect(() => {
    defaultNameRef.current = defaultName;
  }, [defaultName]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(defaultNameRef.current);
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
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const node = dialogRef.current;
    const ownerDocument = node?.ownerDocument;

    if (!node || !ownerDocument) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.stopPropagation();
        onCancel();
        return;
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
    };
  }, [open, busy, onCancel]);

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
        saveError instanceof Error
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
        ref={dialogRef}
        className="cloud-modal cloud-modal--save-as"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-save-as-title"
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
                aria-invalid={Boolean(error)}
              />
            </label>
            {error ? (
              <p className="cloud-modal__error" role="alert">
                {error}
              </p>
            ) : null}
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
