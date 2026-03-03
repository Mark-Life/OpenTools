/** Approval level for an operation */
export type ApprovalLevel = "auto" | "per-call";

/** Cost indicator for an operation */
export type CostIndicator = "free" | "credits" | "paid";

/** Root-level x-llm metadata attached to the OpenAPI spec */
export interface XLlmRoot {
  defaultApproval?: ApprovalLevel;
  description?: string;
  name: string;
  version: string;
}

/** Operation-level x-llm metadata attached to each OpenAPI operation */
export interface XLlmOperation {
  approval?: ApprovalLevel;
  blanketApprovalAllowed?: boolean;
  costIndicator?: CostIndicator;
  destructive?: boolean;
  enabled?: boolean;
  hint?: string;
  rateLimit?: number;
}

/** Shape of /.well-known/llm.json discovery document */
export interface LlmDiscovery {
  auth: string;
  openapi: string;
}

/** Parsed operation extracted from an OpenAPI spec with x-llm metadata */
export interface ParsedOperation {
  inputSchema?: Record<string, unknown>;
  method: string;
  operationId: string;
  path: string;
  summary?: string;
  xlm?: XLlmOperation;
}
