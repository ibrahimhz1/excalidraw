import React, { useEffect, useRef, useState } from "react";

import {
  DotsIcon,
  LoadIcon,
  pencilIcon,
  TrashIcon,
} from "@excalidraw/excalidraw/components/icons";

import { formatRelativeTime } from "../../cloud/library";

import { RenameField } from "./RenameField";
import { ScenePreview } from "./ScenePreview";

import type { CloudDiagram } from "../../cloud/api";

export interface DiagramItemProps {
  diagram: CloudDiagram;
  isCurrent: boolean;
  isRenaming: boolean;
  busy: boolean;
  onOpen: () => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

export const DiagramCard = (props: DiagramItemProps) => {
  const { diagram, isCurrent, isRenaming, busy } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const node = menuRef.current;
    const ownerDocument = node?.ownerDocument;

    if (!ownerDocument) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!node?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    ownerDocument.addEventListener("pointerdown", handlePointerDown);

    return () => {
      ownerDocument.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

  return (
    <article
      className={[
        "cloud-card",
        isCurrent ? "is-current" : "",
        isRenaming ? "is-renaming" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-diagram-id={diagram.id}
    >
      <div className="cloud-card__preview-wrap">
        <button
          type="button"
          className="cloud-card__open"
          aria-label={`Open ${diagram.name}`}
          disabled={busy || isRenaming}
          onClick={props.onOpen}
        >
          <ScenePreview diagram={diagram} />
        </button>
        {isCurrent ? (
          <span className="cloud-card__badge">Current</span>
        ) : null}
      </div>

      <div className="cloud-card__body">
        {isRenaming ? (
          <RenameField
            initialValue={diagram.name}
            busy={busy}
            onCancel={props.onCancelRename}
            onSubmit={props.onRename}
          />
        ) : (
          <button
            type="button"
            className="cloud-card__copy"
            disabled={busy}
            onClick={props.onOpen}
          >
            <strong className="cloud-card__name">{diagram.name}</strong>
            <span className="cloud-card__time">
              Updated {formatRelativeTime(diagram.updatedAt)}
            </span>
          </button>
        )}

        {!isRenaming ? (
          <div className="cloud-card__menu" ref={menuRef}>
            <button
              type="button"
              className="cloud-icon-button cloud-card__menu-trigger"
              aria-label={`Actions for ${diagram.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={busy}
              onClick={() => setMenuOpen((current) => !current)}
            >
              {DotsIcon}
            </button>

            {menuOpen ? (
              <div className="cloud-card__menu-popover" role="menu">
                <button
                  type="button"
                  className="cloud-card__menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    props.onOpen();
                  }}
                >
                  <span aria-hidden="true">{LoadIcon}</span>
                  Open
                </button>
                <button
                  type="button"
                  className="cloud-card__menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    props.onStartRename();
                  }}
                >
                  <span aria-hidden="true">{pencilIcon}</span>
                  Rename
                </button>
                <button
                  type="button"
                  className="cloud-card__menu-item is-danger"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    props.onDelete();
                  }}
                >
                  <span aria-hidden="true">{TrashIcon}</span>
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
};
