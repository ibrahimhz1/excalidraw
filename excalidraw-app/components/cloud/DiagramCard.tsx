import React, { useCallback, useEffect, useRef, useState } from "react";

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
  const [menuDirection, setMenuDirection] = useState<"up" | "down">("down");
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const getMenuItems = useCallback(() => {
    const menu = menuRef.current?.querySelector('[role="menu"]');

    return menu
      ? Array.from(
          menu.querySelectorAll<HTMLButtonElement>(
            '[role="menuitem"]:not([disabled])',
          ),
        )
      : [];
  }, []);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = getMenuItems();

    if (items.length === 0) {
      return;
    }

    const index = items.indexOf(event.target as HTMLButtonElement);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        items[index < 0 ? 0 : (index + 1) % items.length].focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        items[
          index < 0
            ? items.length - 1
            : (index - 1 + items.length) % items.length
        ].focus();
        break;
      case "Home":
        event.preventDefault();
        items[0].focus();
        break;
      case "End":
        event.preventDefault();
        items[items.length - 1].focus();
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        setMenuOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setMenuOpen(false);
        break;
    }
  };

  useEffect(() => {
    if (busy || isRenaming) {
      setMenuOpen(false);
    }
  }, [busy, isRenaming]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    getMenuItems()[0]?.focus();
  }, [menuOpen, getMenuItems]);

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

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const view = triggerRef.current?.ownerDocument.defaultView;

    if (!view) {
      return;
    }

    const handleClose = () => setMenuOpen(false);

    view.addEventListener("scroll", handleClose, true);
    view.addEventListener("resize", handleClose);

    return () => {
      view.removeEventListener("scroll", handleClose, true);
      view.removeEventListener("resize", handleClose);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }

    const trigger = triggerRef.current;
    const view = trigger?.ownerDocument.defaultView;
    const rect = trigger?.getBoundingClientRect();

    if (view && rect) {
      const spaceBelow = view.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      setMenuDirection(spaceBelow < 200 && spaceAbove > 200 ? "up" : "down");
    }

    setMenuOpen(true);
  };

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
        <div
          className="cloud-card__open"
          onClick={() => {
            if (!busy && !isRenaming) {
              props.onOpen();
            }
          }}
        >
          <ScenePreview diagram={diagram} />
        </div>
        {isCurrent ? <span className="cloud-card__badge">Current</span> : null}
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
              ref={triggerRef}
              type="button"
              className="cloud-icon-button cloud-card__menu-trigger"
              aria-label={`Actions for ${diagram.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={busy}
              onClick={toggleMenu}
            >
              {DotsIcon}
            </button>

            {menuOpen ? (
              <div
                className={
                  menuDirection === "up"
                    ? "cloud-card__menu-popover is-up"
                    : "cloud-card__menu-popover"
                }
                role="menu"
                onKeyDown={handleMenuKeyDown}
              >
                <button
                  type="button"
                  className="cloud-card__menu-item"
                  role="menuitem"
                  disabled={busy}
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
                  disabled={busy}
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
                  disabled={busy}
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
