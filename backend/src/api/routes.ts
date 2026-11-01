import type { ApiResult } from "../app";
import * as diagramController from "./diagram.controller";

export interface Route {
  method: string;
  pattern: RegExp;
  handler: (params: string[], body: unknown) => ApiResult | Promise<ApiResult>;
}

export const routes: Route[] = [
  {
    method: "GET",
    pattern: /^\/api\/health$/,
    handler: () => ({ status: 200, body: { status: "ok" } }),
  },
  {
    method: "GET",
    pattern: /^\/api\/diagrams$/,
    handler: () => diagramController.listDiagrams(),
  },
  {
    method: "POST",
    pattern: /^\/api\/diagrams$/,
    handler: (_params, body) => diagramController.createDiagram(body),
  },
  {
    method: "GET",
    pattern: /^\/api\/diagrams\/([^/]+)$/,
    handler: (params) => diagramController.getDiagram(params[0]!),
  },
  {
    method: "PUT",
    pattern: /^\/api\/diagrams\/([^/]+)$/,
    handler: (params, body) =>
      diagramController.updateDiagram(params[0]!, body),
  },
  {
    method: "DELETE",
    pattern: /^\/api\/diagrams\/([^/]+)$/,
    handler: (params) => diagramController.deleteDiagram(params[0]!),
  },
];
