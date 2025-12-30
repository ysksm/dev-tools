/**
 * Todo status value object
 */
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

export const TodoStatus = {
  /**
   * All valid statuses
   */
  values: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'] as const,

  /**
   * Create status from string
   */
  create: (value: string): TodoStatus => {
    if (!TodoStatus.isValid(value)) {
      throw new Error(`Invalid TodoStatus: ${value}`);
    }
    return value as TodoStatus;
  },

  /**
   * Check if value is valid status
   */
  isValid: (value: string): value is TodoStatus => {
    return TodoStatus.values.includes(value as TodoStatus);
  },

  /**
   * Check if todo can transition to target status
   */
  canTransitionTo: (from: TodoStatus, to: TodoStatus): boolean => {
    const transitions: Record<TodoStatus, TodoStatus[]> = {
      pending: ['in_progress', 'blocked', 'cancelled'],
      in_progress: ['pending', 'completed', 'blocked', 'cancelled'],
      completed: ['pending'], // can reopen
      blocked: ['pending', 'in_progress', 'cancelled'],
      cancelled: ['pending'], // can reopen
    };
    return transitions[from].includes(to);
  },

  /**
   * Check if status is closed
   */
  isClosed: (status: TodoStatus): boolean => {
    return status === 'completed' || status === 'cancelled';
  },

  /**
   * Check if status is actionable
   */
  isActionable: (status: TodoStatus): boolean => {
    return status === 'pending' || status === 'in_progress';
  },
} as const;
