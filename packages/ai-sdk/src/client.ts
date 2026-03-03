import { discoverLlm } from "@opentools/ai-sdk/discovery";
import { parseSpec } from "@opentools/ai-sdk/spec-parser";
import { operationsToTools } from "@opentools/ai-sdk/tool-generator";

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
