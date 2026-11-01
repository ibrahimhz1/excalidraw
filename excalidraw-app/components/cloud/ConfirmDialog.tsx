import React, { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export const ConfirmDialog = (props: ConfirmDialogProps) => {
  const { open, busy, onCancel } = props;
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const node = dialogRef.current;
    const ownerDocument = node?.ownerDocument;

    if (!node || !ownerDocument) {
      return;
    }

    const frame = ownerDocument.defaultView?.requestAnimationFrame(() =>
      cancelRef.current?.focus(),
    );

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

      if (frame !== undefined) {
        ownerDocument.defaultView?.cancelAnimationFrame(frame);
      }
    };
  }, [open, busy, onCancel]);

  if (!props.open) {
    return null;
  }

  return (
    <div
      className="cloud-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !props.busy) {
          props.onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="cloud-modal cloud-modal--danger"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cloud-confirm-title"
        aria-describedby="cloud-confirm-message"
      >
        <header className="cloud-modal__header">
          <h2 id="cloud-confirm-title">{props.title}</h2>
        </header>
        <div id="cloud-confirm-message" className="cloud-modal__body">
          {props.message}
        </div>
        <div className="cloud-modal__actions">
          <button
            ref={cancelRef}
            type="button"
            className="cloud-button"
            disabled={props.busy}
            onClick={props.onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="cloud-button cloud-button--danger"
            disabled={props.busy}
            onClick={props.onConfirm}
          >
            {props.busy ? "Deleting..." : props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
