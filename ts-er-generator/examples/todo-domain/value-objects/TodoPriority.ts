/**
 * Todo priority value object
 */
export type TodoPriority = 'high' | 'medium' | 'low';

export const TodoPriority = {
  /**
   * All valid priorities (ordered by importance)
   */
  values: ['high', 'medium', 'low'] as const,

  /**
   * Default priority
   */
  default: 'medium' as TodoPriority,

  /**
   * Create priority from string
   */
  create: (value: string): TodoPriority => {
    if (!TodoPriority.isValid(value)) {
      throw new Error(`Invalid TodoPriority: ${value}`);
    }
    return value as TodoPriority;
  },

  /**
   * Check if value is valid priority
   */
  isValid: (value: string): value is TodoPriority => {
    return TodoPriority.values.includes(value as TodoPriority);
  },

  /**
   * Compare priorities (returns negative if a > b, positive if a < b)
   */
  compare: (a: TodoPriority, b: TodoPriority): number => {
    return TodoPriority.values.indexOf(a) - TodoPriority.values.indexOf(b);
  },
} as const;
