import {
  CaptureUpdateAction,
  restoreAppState,
  restoreElements,
  serializeAsJSON,
} from "@excalidraw/excalidraw";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import type { CloudScene } from "./api";

export function captureScene(
  excalidrawAPI: ExcalidrawImperativeAPI,
): CloudScene {
  return JSON.parse(
    serializeAsJSON(
      excalidrawAPI.getSceneElements(),
      excalidrawAPI.getAppState(),
      excalidrawAPI.getFiles(),
      "local",
    ),
  ) as CloudScene;
}

export function applyScene(
  excalidrawAPI: ExcalidrawImperativeAPI,
  scene: CloudScene,
) {
  const files = scene.files ? Object.values(scene.files) : [];

  if (files.length > 0) {
    excalidrawAPI.addFiles(
      files as Parameters<typeof excalidrawAPI.addFiles>[0],
    );
  }

  excalidrawAPI.updateScene({
    elements: restoreElements(scene.elements as any, null),
    appState: restoreAppState(
      scene.appState as any,
      excalidrawAPI.getAppState(),
    ),
    captureUpdate: CaptureUpdateAction.NEVER,
  });
}
