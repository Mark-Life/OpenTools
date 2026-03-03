"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import type { UIMessage } from "ai";

type ToolPart = Extract<UIMessage["parts"][number], { toolCallId: string }>;

interface ToolApprovalProps {
  addToolOutput: (params: {
    tool: string;
    toolCallId: string;
    output: unknown;
  }) => void;
  part: ToolPart;
  toolName: string;
}

/** Renders approve/deny UI for a tool call that needs user approval */
export function ToolApproval({
  addToolOutput,
  part,
  toolName,
}: ToolApprovalProps) {
  const isDestructive = toolName.toLowerCase().includes("delete");

  const handleApprove = () => {
    addToolOutput({
      tool: toolName,
      toolCallId: part.toolCallId,
      output: { approved: true },
    });
  };

  const handleDeny = () => {
    addToolOutput({
      tool: toolName,
      toolCallId: part.toolCallId,
      output: { approved: false, error: "User denied this tool call" },
    });
  };

  return (
    <Card className="my-2 max-w-md border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline">Tool Call</Badge>
        <span className="font-mono text-sm">{toolName}</span>
        {isDestructive && <Badge variant="destructive">Destructive</Badge>}
      </div>

      {isDestructive && (
        <p className="mb-2 text-destructive text-sm">
          This action is destructive and cannot be undone.
        </p>
      )}

      <pre className="mb-3 overflow-x-auto rounded bg-muted p-2 text-xs">
        {JSON.stringify(part.input, null, 2)}
      </pre>

      <div className="flex gap-2">
        <Button onClick={handleApprove} size="sm">
          Approve
        </Button>
        <Button onClick={handleDeny} size="sm" variant="outline">
          Deny
        </Button>
      </div>
    </Card>
  );
}
