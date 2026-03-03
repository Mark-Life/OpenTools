import type { XLlmOperation } from "@opentools/spec/types";

/** Builds an x-llm extension object for use in oRPC route spec callbacks */
export const xlm = (operation: XLlmOperation): { "x-llm": XLlmOperation } => ({
  "x-llm": operation,
});
