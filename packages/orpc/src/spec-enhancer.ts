import { SPEC_VERSION } from "@opentools/spec/constants";
import type { ApprovalLevel, XLlmRoot } from "@opentools/spec/types";

interface WithXLlmOptions {
  defaultApproval?: ApprovalLevel;
  description?: string;
  name: string;
}

/** Injects root-level x-llm metadata into a generated OpenAPI spec */
export const withXLlm = <T extends Record<string, unknown>>(
  spec: T,
  opts: WithXLlmOptions
): T & { "x-llm": XLlmRoot } => ({
  ...spec,
  "x-llm": {
    version: SPEC_VERSION,
    name: opts.name,
    ...(opts.description !== undefined && { description: opts.description }),
    ...(opts.defaultApproval !== undefined && {
      defaultApproval: opts.defaultApproval,
    }),
  },
});
