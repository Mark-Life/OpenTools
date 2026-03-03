import { z } from "zod";

export const TaskStatus = z.enum(["todo", "in-progress", "done"]);

export const Task = z.object({
  createdAt: z.string().datetime(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  id: z.string(),
  name: z.string(),
  status: TaskStatus,
});

export const CreateTaskInput = z.object({
  description: z.string().optional(),
  dueDate: z.string().optional(),
  name: z.string(),
  status: TaskStatus.default("todo"),
});

export const UpdateTaskInput = z.object({
  description: z.string().optional(),
  dueDate: z.string().optional(),
  id: z.string(),
  name: z.string().optional(),
  status: TaskStatus.optional(),
});

export type Task = z.infer<typeof Task>;
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;
