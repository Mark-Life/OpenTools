import type {
  ParsedOperation,
  XLlmOperation,
  XLlmRoot,
} from "@opentools/spec/types";
import { resolveApproval } from "@opentools/spec/validation";
import type { Tool } from "ai";
import { jsonSchema, tool } from "ai";

interface ToolGeneratorOpts {
  baseUrl: string;
  headers?: Record<string, string>;
  namespace?: string;
  root?: XLlmRoot;
}

export interface ToolMetadata extends XLlmOperation {
  needsApproval: boolean;
}

/** Builds a tool description from summary and optional hint */
const buildDescription = (op: ParsedOperation) => {
  const base = op.summary ?? op.operationId;
  return op.xlm?.hint ? `${base}\n${op.xlm.hint}` : base;
};

/** Builds a tool name with optional namespace prefix */
const buildToolName = (operationId: string, namespace?: string) =>
  namespace ? `${namespace}_${operationId}` : operationId;

/** Substitutes path parameters like {id} with actual values */
const substitutePath = (path: string, args: Record<string, unknown>): string =>
  path.replace(/\{(\w+)\}/g, (_, key: string) => String(args[key] ?? ""));

/** Collects non-path args (args not matched by path template params) */
const collectNonPathArgs = (
  path: string,
  args: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (!path.includes(`{${key}}`)) {
      result[key] = value;
    }
  }
  return result;
};

/** Builds the fetch URL, appending query params for GET requests */
const buildFetchUrl = (
  baseUrl: string,
  path: string,
  method: string,
  args: Record<string, unknown>
): string => {
  const resolvedPath = substitutePath(path, args);
  const url = new URL(resolvedPath, baseUrl);
  if (method === "GET") {
    const nonPathArgs = collectNonPathArgs(path, args);
    for (const [key, value] of Object.entries(nonPathArgs)) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
};

/** Builds the fetch request body for non-GET requests */
const buildFetchBody = (
  path: string,
  method: string,
  args: Record<string, unknown>
): string | undefined => {
  if (method === "GET") {
    return undefined;
  }
  const body = collectNonPathArgs(path, args);
  return JSON.stringify(body);
};

/** Creates an execute function for a parsed operation */
const createExecute = (op: ParsedOperation, opts: ToolGeneratorOpts) => {
  const trailingSlash = opts.baseUrl.endsWith("/") ? "" : "/";
  const normalizedBase = `${opts.baseUrl}${trailingSlash}`;

  return async (args: unknown) => {
    const typedArgs = (args ?? {}) as Record<string, unknown>;
    const url = buildFetchUrl(normalizedBase, op.path, op.method, typedArgs);
    const headers: Record<string, string> = { ...opts.headers };
    if (op.method !== "GET") {
      headers["Content-Type"] = "application/json";
    }
    const body = buildFetchBody(op.path, op.method, typedArgs);
    const response = await fetch(url, {
      method: op.method,
      headers,
      body,
    });
    return response.json();
  };
};

/** Converts parsed operations into AI SDK tools and metadata */
export const operationsToTools = (
  operations: ParsedOperation[],
  opts: ToolGeneratorOpts
) => {
  const tools: Record<string, Tool> = {};
  const metadata: Record<string, ToolMetadata> = {};

  for (const op of operations) {
    const name = buildToolName(op.operationId, opts.namespace);
    const approval = resolveApproval(op.xlm, opts.root);
    const needsApproval = approval === "per-call";

    const description = buildDescription(op);
    const parameters = op.inputSchema
      ? jsonSchema(op.inputSchema)
      : jsonSchema({ type: "object", properties: {} });

    tools[name] = tool({
      description,
      parameters,
      execute: createExecute(op, opts),
    });

    metadata[name] = {
      ...(op.xlm ?? {}),
      needsApproval,
    };
  }

  return { tools, metadata };
};
