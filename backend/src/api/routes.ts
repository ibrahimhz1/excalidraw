import type { ApiResult, RequestContext } from "../app";
import * as authController from "./auth.controller";
import * as diagramController from "./diagram.controller";

export interface Route {
  method: string;
  pattern: RegExp;
  requiresAuth?: boolean;
  handler: (
    params: string[],
    body: unknown,
    ctx: RequestContext,
  ) => ApiResult | Promise<ApiResult>;
}

export const routes: Route[] = [
  {
    method: "GET",
    pattern: /^\/api\/health$/,
    handler: () => ({ status: 200, body: { status: "ok" } }),
  },
  {
    method: "GET",
    pattern: /^\/api\/auth\/google$/,
    handler: () => authController.startGoogleAuth(),
  },
  {
    method: "GET",
    pattern: /^\/api\/auth\/google\/callback$/,
    handler: authController.googleCallback,
  },
  {
    method: "GET",
    pattern: /^\/api\/auth\/me$/,
    requiresAuth: true,
    handler: authController.me,
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/logout$/,
    requiresAuth: true,
    handler: authController.logout,
  },
  {
    method: "GET",
    pattern: /^\/api\/diagrams$/,
    requiresAuth: true,
    handler: (_params, _body, ctx) =>
      diagramController.listDiagrams(ctx.user!.id),
  },
  {
    method: "POST",
    pattern: /^\/api\/diagrams$/,
    requiresAuth: true,
    handler: (_params, body, ctx) =>
      diagramController.createDiagram(ctx.user!.id, body),
  },
  {
    method: "GET",
    pattern: /^\/api\/diagrams\/([^/]+)$/,
    requiresAuth: true,
    handler: (params, _body, ctx) =>
      diagramController.getDiagram(ctx.user!.id, params[0]!),
  },
  {
    method: "PUT",
    pattern: /^\/api\/diagrams\/([^/]+)$/,
    requiresAuth: true,
    handler: (params, body, ctx) =>
      diagramController.updateDiagram(ctx.user!.id, params[0]!, body),
  },
  {
    method: "PATCH",
    pattern: /^\/api\/diagrams\/([^/]+)$/,
    requiresAuth: true,
    handler: (params, body, ctx) =>
      diagramController.renameDiagram(ctx.user!.id, params[0]!, body),
  },
  {
    method: "DELETE",
    pattern: /^\/api\/diagrams\/([^/]+)$/,
    requiresAuth: true,
    handler: (params, _body, ctx) =>
      diagramController.deleteDiagram(ctx.user!.id, params[0]!),
  },
];
