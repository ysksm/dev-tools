/**
 * Todo ID value object (branded type)
 * @pk
 */
export type TodoId = string & { readonly __brand: unique symbol };

export const TodoId = {
  /**
   * Create TodoId from existing string
   */
  create: (value: string): TodoId => {
    if (!value || value.trim().length === 0) {
      throw new Error('TodoId cannot be empty');
    }
    return value as TodoId;
  },

  /**
   * Generate new TodoId
   */
  generate: (): TodoId => {
    return crypto.randomUUID() as TodoId;
  },

  /**
   * Check equality
   */
  equals: (a: TodoId, b: TodoId): boolean => a === b,
} as const;
