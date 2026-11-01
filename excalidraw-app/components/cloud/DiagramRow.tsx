import React from "react";

import {
  LoadIcon,
  pencilIcon,
  TrashIcon,
} from "@excalidraw/excalidraw/components/icons";

import { formatRelativeTime } from "../../cloud/library";

import { RenameField } from "./RenameField";
import { ScenePreview } from "./ScenePreview";

import type { DiagramItemProps } from "./DiagramCard";

export const DiagramRow = (props: DiagramItemProps) => {
  const { diagram, isCurrent, isRenaming, busy } = props;

  return (
    <article
      className={[
        "cloud-row",
        isCurrent ? "is-current" : "",
        isRenaming ? "is-renaming" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-diagram-id={diagram.id}
    >
      <button
        type="button"
        className="cloud-row__preview"
        aria-label={`Open ${diagram.name}`}
        disabled={busy || isRenaming}
        onClick={props.onOpen}
      >
        <ScenePreview diagram={diagram} />
      </button>

      <div className="cloud-row__copy">
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
            className="cloud-row__name-button"
            disabled={busy}
            onClick={props.onOpen}
          >
            <strong className="cloud-row__name">
              {diagram.name}
              {isCurrent ? (
                <span className="cloud-row__badge">Current</span>
              ) : null}
            </strong>
            <span className="cloud-row__meta">
              Updated {formatRelativeTime(diagram.updatedAt)}
              <span aria-hidden="true"> · </span>
              Created {formatRelativeTime(diagram.createdAt)}
            </span>
          </button>
        )}
      </div>

      {!isRenaming ? (
        <div className="cloud-row__actions">
          <button
            type="button"
            className="cloud-icon-button"
            aria-label={`Open ${diagram.name}`}
            disabled={busy}
            onClick={props.onOpen}
          >
            {LoadIcon}
          </button>
          <button
            type="button"
            className="cloud-icon-button"
            aria-label={`Rename ${diagram.name}`}
            disabled={busy}
            onClick={props.onStartRename}
          >
            {pencilIcon}
          </button>
          <button
            type="button"
            className="cloud-icon-button is-danger"
            aria-label={`Delete ${diagram.name}`}
            disabled={busy}
            onClick={props.onDelete}
          >
            {TrashIcon}
          </button>
        </div>
      ) : null}
    </article>
  );
};
