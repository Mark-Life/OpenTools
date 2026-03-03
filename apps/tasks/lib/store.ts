import type { CreateTaskInput, Task, UpdateTaskInput } from "@/lib/schemas";

const tasks = new Map<string, Task>();

const seed: Task[] = [
  {
    id: "1",
    name: "Buy groceries",
    description: "Milk, eggs, bread, and butter",
    status: "todo",
    createdAt: new Date("2025-01-01").toISOString(),
  },
  {
    id: "2",
    name: "Write documentation",
    description: "Update the API docs for v2",
    status: "in-progress",
    createdAt: new Date("2025-01-02").toISOString(),
  },
  {
    id: "3",
    name: "Deploy to production",
    status: "done",
    createdAt: new Date("2025-01-03").toISOString(),
  },
];

for (const task of seed) {
  tasks.set(task.id, task);
}

let nextId = 4;

/** List all tasks */
export const listTasks = () => [...tasks.values()];

/** Get a single task by ID */
export const getTask = (id: string) => tasks.get(id) ?? null;

/** Create a new task */
export const createTask = (input: CreateTaskInput): Task => {
  const task: Task = {
    ...input,
    id: String(nextId++),
    createdAt: new Date().toISOString(),
  };
  tasks.set(task.id, task);
  return task;
};

/** Update an existing task */
export const updateTask = (input: UpdateTaskInput): Task | null => {
  const existing = tasks.get(input.id);
  if (!existing) {
    return null;
  }

  const updated: Task = {
    ...existing,
    ...Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined)
    ),
  };
  tasks.set(updated.id, updated);
  return updated;
};

/** Delete a task by ID */
export const deleteTask = (id: string): boolean => tasks.delete(id);
