import { xlm } from "@opentools/orpc/metadata";
import { os } from "@orpc/server";
import { z } from "zod";
import { CreateTaskInput, Task, UpdateTaskInput } from "@/lib/schemas";
import {
  createTask as createTaskFn,
  deleteTask as deleteTaskFn,
  getTask as getTaskFn,
  listTasks as listTasksFn,
  updateTask as updateTaskFn,
} from "@/lib/store";

const listTasks = os
  .route({
    method: "GET",
    path: "/tasks",
    summary: "List all tasks",
    spec: (s) => ({ ...s, ...xlm({ approval: "auto" }) }),
  })
  .output(z.array(Task))
  .handler(() => listTasksFn());

const getTask = os
  .route({
    method: "GET",
    path: "/tasks/{id}",
    summary: "Get a task by ID",
    spec: (s) => ({ ...s, ...xlm({ approval: "auto" }) }),
  })
  .input(z.object({ id: z.string() }))
  .output(Task.nullable())
  .handler(({ input }) => getTaskFn(input.id));

const createTask = os
  .route({
    method: "POST",
    path: "/tasks",
    summary: "Create a new task",
    spec: (s) => ({ ...s, ...xlm({ approval: "per-call" }) }),
  })
  .input(CreateTaskInput)
  .output(Task)
  .handler(({ input }) => createTaskFn(input));

const updateTask = os
  .route({
    method: "PATCH",
    path: "/tasks/{id}",
    summary: "Update an existing task",
    spec: (s) => ({ ...s, ...xlm({ approval: "per-call" }) }),
  })
  .input(UpdateTaskInput)
  .output(Task.nullable())
  .handler(({ input }) => updateTaskFn(input));

const deleteTask = os
  .route({
    method: "DELETE",
    path: "/tasks/{id}",
    summary: "Delete a task",
    spec: (s) => ({
      ...s,
      ...xlm({ approval: "per-call", destructive: true }),
    }),
  })
  .input(z.object({ id: z.string() }))
  .output(z.object({ success: z.boolean() }))
  .handler(({ input }) => ({ success: deleteTaskFn(input.id) }));

export const router = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
};
