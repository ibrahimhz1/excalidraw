import React, { useEffect, useRef, useState } from "react";

import { gridIcon } from "@excalidraw/excalidraw/components/icons";

import { getScenePreview, invalidateScenePreview } from "../../cloud/previews";

import type { CloudDiagram } from "../../cloud/api";

interface ScenePreviewProps {
  diagram: CloudDiagram;
}

type PreviewState =
  | { status: "idle" | "loading" | "error" }
  | { status: "ready"; url: string };

export const ScenePreview = (props: ScenePreviewProps) => {
  const { diagram } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const recoveredRef = useRef(false);
  const [state, setState] = useState<PreviewState>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    recoveredRef.current = false;
  }, [diagram.id]);

  useEffect(() => {
    const node = containerRef.current;

    if (!node) {
      return;
    }

    let cancelled = false;

    const load = () => {
      setState((current) =>
        current.status === "ready" ? current : { status: "loading" },
      );

      getScenePreview(diagram)
        .then((url) => {
          if (!cancelled) {
            setState({ status: "ready", url });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setState({ status: "error" });
          }
        });
    };

    const view = node.ownerDocument.defaultView;

    if (!view || typeof view.IntersectionObserver === "undefined") {
      load();

      return () => {
        cancelled = true;
      };
    }

    const observer = new view.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      {
        root: node.closest(".cloud-library__body"),
        rootMargin: "240px 0px",
      },
    );

    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [diagram, attempt]);

  const handleImageError = () => {
    if (recoveredRef.current) {
      setState({ status: "error" });

      return;
    }

    recoveredRef.current = true;
    invalidateScenePreview(diagram.id);
    setState({ status: "loading" });
    setAttempt((current) => current + 1);
  };

  const retry = (event: React.MouseEvent) => {
    event.stopPropagation();
    recoveredRef.current = false;
    setState({ status: "loading" });
    setAttempt((current) => current + 1);
  };

  return (
    <div ref={containerRef} className={`cloud-preview is-${state.status}`}>
      {state.status === "ready" ? (
        <img
          className="cloud-preview__img"
          src={state.url}
          alt=""
          loading="lazy"
          onError={handleImageError}
        />
      ) : null}

      {state.status === "idle" || state.status === "loading" ? (
        <span className="cloud-preview__skeleton" aria-hidden="true" />
      ) : null}

      {state.status === "error" ? (
        <span className="cloud-preview__fallback">
          <span className="cloud-preview__fallback-icon" aria-hidden="true">
            {gridIcon}
          </span>
          <span>Preview unavailable</span>
          <button
            type="button"
            className="cloud-preview__retry"
            onClick={retry}
          >
            Retry
          </button>
        </span>
      ) : null}
    </div>
  );
};
