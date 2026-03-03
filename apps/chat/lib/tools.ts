import { createToolsFromUrl } from "@opentools/ai-sdk/client";
import type { Connection } from "./connections";

/** Load AI SDK tools from all active connections */
export const loadAllTools = async (connections: Connection[]) => {
  const results = await Promise.all(
    connections.map((conn) => {
      const headers: Record<string, string> = {};
      if (conn.apiKey) {
        headers.Authorization = `Bearer ${conn.apiKey}`;
      }
      return createToolsFromUrl(conn.baseUrl, {
        headers,
        namespace: conn.name.toLowerCase().replace(/\s+/g, "_"),
      });
    })
  );

  const tools: Record<string, unknown> = {};
  const metadata: Record<string, unknown> = {};

  for (const result of results) {
    Object.assign(tools, result.tools);
    Object.assign(metadata, result.metadata);
  }

  return { tools, metadata };
};
