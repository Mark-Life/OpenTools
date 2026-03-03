import type {
  ParsedOperation,
  XLlmOperation,
  XLlmRoot,
} from "@opentools/spec/types";
import { isXLlmOperation, isXLlmRoot } from "@opentools/spec/validation";

interface OpenApiOperation {
  operationId?: string;
  parameters?: Array<{
    in: string;
    name: string;
    required?: boolean;
    schema?: Record<string, unknown>;
  }>;
  requestBody?: {
    content?: Record<
      string,
      {
        schema?: Record<string, unknown>;
      }
    >;
  };
  summary?: string;
  "x-llm"?: unknown;
}

interface OpenApiSpec {
  paths?: Record<string, Record<string, OpenApiOperation>>;
  "x-llm"?: unknown;
}

/** Collects properties and required fields from operation parameters */
const collectParams = (params: NonNullable<OpenApiOperation["parameters"]>) => {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const param of params) {
    properties[param.name] = param.schema ?? { type: "string" };
    if (param.required) {
      required.push(param.name);
    }
  }
  return { properties, required };
};

/** Merges request body schema properties into existing properties/required */
const mergeBodySchema = (
  bodySchema: Record<string, unknown>,
  properties: Record<string, unknown>,
  required: string[]
) => {
  if (
    bodySchema.type !== "object" ||
    !bodySchema.properties ||
    typeof bodySchema.properties !== "object"
  ) {
    return bodySchema;
  }
  for (const [key, value] of Object.entries(bodySchema.properties)) {
    properties[key] = value;
  }
  if (Array.isArray(bodySchema.required)) {
    for (const r of bodySchema.required) {
      if (typeof r === "string") {
        required.push(r);
      }
    }
  }
  return undefined;
};

/** Builds a JSON Schema object from properties and required arrays */
const buildSchema = (
  properties: Record<string, unknown>,
  required: string[]
): Record<string, unknown> | undefined => {
  if (Object.keys(properties).length === 0) {
    return undefined;
  }
  const schema: Record<string, unknown> = { type: "object", properties };
  if (required.length > 0) {
    schema.required = required;
  }
  return schema;
};

/** Extracts inputSchema from an OpenAPI operation (parameters + requestBody) */
const extractInputSchema = (
  op: OpenApiOperation,
  method: string
): Record<string, unknown> | undefined => {
  const { properties, required } = op.parameters
    ? collectParams(op.parameters)
    : { properties: {} as Record<string, unknown>, required: [] as string[] };

  const bodySchema =
    method !== "get"
      ? op.requestBody?.content?.["application/json"]?.schema
      : undefined;

  if (bodySchema) {
    const override = mergeBodySchema(bodySchema, properties, required);
    if (override) {
      return override;
    }
  }

  return buildSchema(properties, required);
};

/** Extracts the x-llm root from an OpenAPI spec */
const extractRoot = (spec: OpenApiSpec): XLlmRoot | undefined =>
  spec["x-llm"] && isXLlmRoot(spec["x-llm"])
    ? (spec["x-llm"] as XLlmRoot)
    : undefined;

/** Extracts the x-llm operation metadata from an OpenAPI operation */
const extractXlm = (op: OpenApiOperation): XLlmOperation | undefined =>
  op["x-llm"] && isXLlmOperation(op["x-llm"])
    ? (op["x-llm"] as XLlmOperation)
    : undefined;

/** Parses a single OpenAPI operation into a ParsedOperation */
const parseOperation = (
  path: string,
  method: string,
  op: OpenApiOperation
): ParsedOperation | undefined => {
  if (!op.operationId) {
    return undefined;
  }
  const xlm = extractXlm(op);
  if (xlm?.enabled === false) {
    return undefined;
  }
  return {
    inputSchema: extractInputSchema(op, method),
    method: method.toUpperCase(),
    operationId: op.operationId,
    path,
    summary: op.summary,
    xlm,
  };
};

/** Fetches an OpenAPI spec and extracts x-llm root + parsed operations */
export const parseSpec = async (
  specUrl: string
): Promise<{ operations: ParsedOperation[]; root: XLlmRoot | undefined }> => {
  const response = await fetch(specUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch OpenAPI spec from ${specUrl}: ${response.status} ${response.statusText}`
    );
  }
  const spec = (await response.json()) as OpenApiSpec;
  const root = extractRoot(spec);
  const operations: ParsedOperation[] = [];

  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(methods)) {
      const parsed = parseOperation(path, method, op);
      if (parsed) {
        operations.push(parsed);
      }
    }
  }

  return { operations, root };
};
