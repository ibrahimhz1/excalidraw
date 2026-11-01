import {
  exportScene,
  getNonDeletedElements,
  restoreElements,
} from "@excalidraw/excalidraw";

import { getDiagram } from "./api";

import type { BinaryFiles } from "@excalidraw/excalidraw/types";

import type { CloudDiagram, CloudScene } from "./api";

const maxConcurrent = 3;
const maxCached = 40;

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
const waiters: Array<() => void> = [];

let active = 0;

function cacheKey(diagram: Pick<CloudDiagram, "id" | "updatedAt">): string {
  return `${diagram.id}:${diagram.updatedAt}`;
}

async function acquireSlot(): Promise<void> {
  if (active < maxConcurrent) {
    active += 1;
    return;
  }

  await new Promise<void>((resolve) => waiters.push(resolve));
  active += 1;
}

function releaseSlot(): void {
  active -= 1;
  waiters.shift()?.();
}

function remember(key: string, url: string): void {
  cache.set(key, url);

  while (cache.size > maxCached) {
    const oldestKey = cache.keys().next().value as string | undefined;

    if (!oldestKey) {
      break;
    }

    const oldestUrl = cache.get(oldestKey);
    cache.delete(oldestKey);

    if (oldestUrl) {
      URL.revokeObjectURL(oldestUrl);
    }
  }
}

async function renderPreview(scene: CloudScene): Promise<string> {
  const svg = await exportScene({
    type: "svg",
    data: {
      elements: getNonDeletedElements(
        restoreElements(scene.elements as any, null),
      ),
      appState: (scene.appState ?? {}) as any,
      files: (scene.files ?? null) as BinaryFiles | null,
    },
    config: {
      maxWidthOrHeight: 480,
      padding: 16,
    },
  });

  const markup = new XMLSerializer().serializeToString(svg);

  return URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
}

async function buildPreview(
  diagram: Pick<CloudDiagram, "id" | "updatedAt">,
): Promise<string> {
  await acquireSlot();

  try {
    const { content } = await getDiagram(diagram.id);
    return await renderPreview(content);
  } finally {
    releaseSlot();
  }
}

export function getScenePreview(
  diagram: Pick<CloudDiagram, "id" | "updatedAt">,
): Promise<string> {
  const key = cacheKey(diagram);
  const cached = cache.get(key);

  if (cached) {
    return Promise.resolve(cached);
  }

  const inFlight = pending.get(key);

  if (inFlight) {
    return inFlight;
  }

  const task = buildPreview(diagram)
    .then((url) => {
      remember(key, url);
      return url;
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, task);
  return task;
}

export function invalidateScenePreview(id: string): void {
  for (const [key, url] of cache) {
    if (key.startsWith(`${id}:`)) {
      cache.delete(key);
      URL.revokeObjectURL(url);
    }
  }
}

export function clearScenePreviewCache(): void {
  for (const url of cache.values()) {
    URL.revokeObjectURL(url);
  }

  cache.clear();
  pending.clear();
}
