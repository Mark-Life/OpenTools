import { DEFAULT_APPROVAL } from "@opentools/spec/constants";
import type {
  ApprovalLevel,
  XLlmOperation,
  XLlmRoot,
} from "@opentools/spec/types";

/** Type guard: checks if a value is a valid XLlmOperation */
export const isXLlmOperation = (value: unknown): value is XLlmOperation => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (obj.enabled !== undefined && typeof obj.enabled !== "boolean") {
    return false;
  }
  if (
    obj.approval !== undefined &&
    obj.approval !== "auto" &&
    obj.approval !== "per-call"
  ) {
    return false;
  }
  if (obj.destructive !== undefined && typeof obj.destructive !== "boolean") {
    return false;
  }
  if (obj.hint !== undefined && typeof obj.hint !== "string") {
    return false;
  }
  return true;
};

/** Type guard: checks if a value is a valid XLlmRoot */
export const isXLlmRoot = (value: unknown): value is XLlmRoot => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.version !== "string") {
    return false;
  }
  if (typeof obj.name !== "string") {
    return false;
  }
  if (obj.description !== undefined && typeof obj.description !== "string") {
    return false;
  }
  if (
    obj.defaultApproval !== undefined &&
    obj.defaultApproval !== "auto" &&
    obj.defaultApproval !== "per-call"
  ) {
    return false;
  }
  return true;
};

/** Resolves the effective approval level for an operation */
export const resolveApproval = (
  op?: XLlmOperation,
  root?: XLlmRoot
): ApprovalLevel => {
  if (op?.approval) {
    return op.approval;
  }
  if (root?.defaultApproval) {
    return root.defaultApproval;
  }
  return DEFAULT_APPROVAL;
};
