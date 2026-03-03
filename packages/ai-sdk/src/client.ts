import { discoverLlm } from "./discovery.js";
import { parseSpec } from "./spec-parser.js";
import { operationsToTools } from "./tool-generator.js";

interface CreateToolsOpts {
  headers?: Record<string, string>;
  namespace?: string;
}

/** Discovers, parses, and generates AI SDK tools from a base URL */
export const createToolsFromUrl = async (
  baseUrl: string,
  opts?: CreateToolsOpts
) => {
  const discovery = await discoverLlm(baseUrl);
  const specUrl = new URL(discovery.openapi, baseUrl).toString();
  const { root, operations } = await parseSpec(specUrl);

  const { tools, metadata } = operationsToTools(operations, {
    baseUrl,
    headers: opts?.headers,
    namespace: opts?.namespace,
    root,
  });

  return { tools, metadata, root };
};
