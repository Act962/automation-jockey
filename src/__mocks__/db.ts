import { vi, type Mock } from "vitest";

type AnyFn = Mock<(...args: unknown[]) => unknown>;

export const prisma: {
  consultant: Record<string, AnyFn>;
  lead: Record<string, AnyFn>;
  messageTemplate: Record<string, AnyFn>;
  interaction: Record<string, AnyFn>;
  $transaction: AnyFn;
} = {
  consultant: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  lead: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  messageTemplate: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  interaction: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn().mockImplementation((ops: unknown[]) =>
    Promise.all(ops),
  ),
};
