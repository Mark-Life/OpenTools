"use client";

import { useChat } from "@ai-sdk/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { ToolApproval } from "./tool-approval";

type ToolPart = Extract<UIMessage["parts"][number], { toolCallId: string }>;

/** Type guard for tool invocation parts */
const isToolPart = (part: UIMessage["parts"][number]): part is ToolPart =>
  "toolCallId" in part;

const TOOL_PREFIX = /^tool-/;

/** Extracts the tool name from a tool part type string */
const getToolName = (part: ToolPart) => part.type.replace(TOOL_PREFIX, "");

type AddToolOutputFn = (params: {
  tool: string;
  toolCallId: string;
  output: unknown;
}) => void;

/** Renders a single tool invocation (call or result) inline */
const ToolInvocationDisplay = ({
  addToolOutput,
  part,
}: {
  addToolOutput: AddToolOutputFn;
  part: ToolPart;
}) => {
  const toolName = getToolName(part);

  if (part.state === "input-available") {
    return (
      <ToolApproval
        addToolOutput={addToolOutput}
        part={part}
        toolName={toolName}
      />
    );
  }

  if (part.state === "input-streaming") {
    return (
      <div className="my-1 flex items-center gap-2 text-muted-foreground text-sm">
        <Badge variant="secondary">Calling</Badge>
        <span className="font-mono">{toolName}</span>
      </div>
    );
  }

  if (part.state === "output-available") {
    return (
      <Card className="my-2 max-w-md bg-muted/50 p-3">
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="secondary">Result</Badge>
          <span className="font-mono text-sm">{toolName}</span>
        </div>
        <pre className="overflow-x-auto rounded bg-background p-2 text-xs">
          {JSON.stringify(part.output, null, 2)}
        </pre>
      </Card>
    );
  }

  if (part.state === "output-error") {
    return (
      <Card className="my-2 max-w-md bg-destructive/10 p-3">
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="destructive">Error</Badge>
          <span className="font-mono text-sm">{toolName}</span>
        </div>
        <pre className="overflow-x-auto rounded bg-background p-2 text-xs">
          {part.errorText}
        </pre>
      </Card>
    );
  }

  return null;
};

/** Renders a single message with text and tool invocation parts */
const MessageBubble = ({
  addToolOutput,
  message,
}: {
  addToolOutput: AddToolOutputFn;
  message: UIMessage;
}) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {message.parts.map((part, i) => {
          const key = `${message.id}-${i}`;

          if (part.type === "text") {
            if (!part.text) {
              return null;
            }
            return (
              <p className="whitespace-pre-wrap" key={key}>
                {part.text}
              </p>
            );
          }

          if (isToolPart(part)) {
            return (
              <ToolInvocationDisplay
                addToolOutput={addToolOutput}
                key={key}
                part={part}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

/** Main chat interface component using AI SDK useChat hook */
export function ChatInterface() {
  const [input, setInput] = useState("");
  const {
    addToolOutput,
    error,
    messages,
    regenerate,
    sendMessage,
    status,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="font-bold text-lg">Chat</h1>
        <a href="/settings">
          <Button size="sm" variant="outline">
            Settings
          </Button>
        </a>
      </header>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble
              addToolOutput={addToolOutput}
              key={message.id}
              message={message}
            />
          ))}

          {isLoading && messages.at(-1)?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-muted px-4 py-2 text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {isLoading && (
        <div className="flex justify-center border-t px-4 py-2">
          <Button
            onClick={() => stop()}
            size="sm"
            type="button"
            variant="outline"
          >
            Stop
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 border-t px-4 py-2 text-destructive text-sm">
          <span>Something went wrong.</span>
          <Button
            onClick={() => regenerate()}
            size="sm"
            type="button"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      )}

      <form
        className="flex gap-2 border-t p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <Input
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          value={input}
        />
        <Button disabled={isLoading || !input.trim()} type="submit">
          Send
        </Button>
      </form>
    </div>
  );
}
