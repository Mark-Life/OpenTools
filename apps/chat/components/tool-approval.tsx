"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import type { ToolInvocation } from "ai";

interface ToolApprovalProps {
  addToolResult: (params: { toolCallId: string; result: unknown }) => void;
  toolInvocation: ToolInvocation & { state: "call" };
}

/** Renders approve/deny UI for a tool call that needs user approval */
export function ToolApproval({
  addToolResult,
  toolInvocation,
}: ToolApprovalProps) {
  const isDestructive = toolInvocation.toolName
    .toLowerCase()
    .includes("delete");

  const handleApprove = () => {
    addToolResult({
      toolCallId: toolInvocation.toolCallId,
      result: { approved: true },
    });
  };

  const handleDeny = () => {
    addToolResult({
      toolCallId: toolInvocation.toolCallId,
      result: { approved: false, error: "User denied this tool call" },
    });
  };

  return (
    <Card className="my-2 max-w-md border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline">Tool Call</Badge>
        <span className="font-mono text-sm">{toolInvocation.toolName}</span>
        {isDestructive && <Badge variant="destructive">Destructive</Badge>}
      </div>

      {isDestructive && (
        <p className="mb-2 text-destructive text-sm">
          This action is destructive and cannot be undone.
        </p>
      )}

      <pre className="mb-3 overflow-x-auto rounded bg-muted p-2 text-xs">
        {JSON.stringify(toolInvocation.args, null, 2)}
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
