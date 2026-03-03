"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useCallback, useEffect, useState } from "react";
import type { Task } from "@/lib/schemas";

const statusVariant = (status: Task["status"]) => {
  switch (status) {
    case "todo":
      return "outline" as const;
    case "in-progress":
      return "default" as const;
    case "done":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <p className="text-muted-foreground text-sm">No tasks found.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {task.name}
              <Badge variant={statusVariant(task.status)}>{task.status}</Badge>
            </CardTitle>
            {task.description && (
              <CardDescription>{task.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-muted-foreground text-xs">
              {task.dueDate && <span>Due: {formatDate(task.dueDate)}</span>}
              <span>Created: {formatDate(task.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tasks");
    const data = (await res.json()) as Task[];
    setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-bold text-2xl">Tasks</h1>
        <Button onClick={fetchTasks} variant="outline">
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading tasks...</p>
      ) : (
        <TaskList tasks={tasks} />
      )}
    </main>
  );
}
