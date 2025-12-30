import { TodoId } from '../value-objects/TodoId.ts';
import { UserStoryId } from '../value-objects/UserStoryId.ts';
import { UserId } from '../value-objects/UserId.ts';
import { TodoStatus } from '../value-objects/TodoStatus.ts';
import { TodoPriority } from '../value-objects/TodoPriority.ts';

/**
 * Todo entity - represents a task within a UserStory
 */
export interface Todo {
  /** @pk */
  readonly id: TodoId;
  readonly title: string;
  readonly description?: string;
  readonly status: TodoStatus;
  readonly priority: TodoPriority;
  /** @fk - belongs to UserStory */
  readonly userStoryId: UserStoryId;
  /** @fk - assigned to User */
  readonly assigneeId?: UserId;
  readonly estimatedMinutes?: number;
  readonly actualMinutes?: number;
  readonly dueDate?: Date;
  readonly order: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly completedAt?: Date;
}

export const Todo = {
  /**
   * Create a new Todo
   */
  create: (props: {
    id?: TodoId;
    title: string;
    description?: string;
    priority?: TodoPriority;
    userStoryId: UserStoryId;
    assigneeId?: UserId;
    estimatedMinutes?: number;
    dueDate?: Date;
    order?: number;
  }): Todo => {
    const now = new Date();
    return {
      id: props.id ?? TodoId.generate(),
      title: props.title,
      description: props.description,
      status: 'pending',
      priority: props.priority ?? TodoPriority.default,
      userStoryId: props.userStoryId,
      assigneeId: props.assigneeId,
      estimatedMinutes: props.estimatedMinutes,
      actualMinutes: undefined,
      dueDate: props.dueDate,
      order: props.order ?? 0,
      createdAt: now,
      updatedAt: now,
      completedAt: undefined,
    };
  },

  /**
   * Reconstruct Todo from persistence
   */
  reconstruct: (props: Todo): Todo => ({ ...props }),

  /**
   * Update title and description
   */
  updateContent: (
    todo: Todo,
    props: { title?: string; description?: string }
  ): Todo => ({
    ...todo,
    title: props.title ?? todo.title,
    description: props.description ?? todo.description,
    updatedAt: new Date(),
  }),

  /**
   * Transition to new status
   */
  transitionTo: (todo: Todo, newStatus: TodoStatus): Todo => {
    if (!TodoStatus.canTransitionTo(todo.status, newStatus)) {
      throw new Error(`Cannot transition from ${todo.status} to ${newStatus}`);
    }

    const now = new Date();
    return {
      ...todo,
      status: newStatus,
      updatedAt: now,
      completedAt: newStatus === 'completed' ? now : todo.completedAt,
    };
  },

  /**
   * Start working on todo
   */
  start: (todo: Todo): Todo => {
    return Todo.transitionTo(todo, 'in_progress');
  },

  /**
   * Complete todo
   */
  complete: (todo: Todo, actualMinutes?: number): Todo => {
    const completed = Todo.transitionTo(todo, 'completed');
    if (actualMinutes !== undefined) {
      return {
        ...completed,
        actualMinutes,
      };
    }
    return completed;
  },

  /**
   * Block todo
   */
  block: (todo: Todo): Todo => {
    return Todo.transitionTo(todo, 'blocked');
  },

  /**
   * Cancel todo
   */
  cancel: (todo: Todo): Todo => {
    return Todo.transitionTo(todo, 'cancelled');
  },

  /**
   * Reopen todo
   */
  reopen: (todo: Todo): Todo => {
    return Todo.transitionTo(todo, 'pending');
  },

  /**
   * Update priority
   */
  updatePriority: (todo: Todo, priority: TodoPriority): Todo => ({
    ...todo,
    priority,
    updatedAt: new Date(),
  }),

  /**
   * Assign to user
   */
  assignTo: (todo: Todo, assigneeId: UserId): Todo => ({
    ...todo,
    assigneeId,
    updatedAt: new Date(),
  }),

  /**
   * Unassign from user
   */
  unassign: (todo: Todo): Todo => ({
    ...todo,
    assigneeId: undefined,
    updatedAt: new Date(),
  }),

  /**
   * Update estimate
   */
  updateEstimate: (todo: Todo, estimatedMinutes: number): Todo => ({
    ...todo,
    estimatedMinutes,
    updatedAt: new Date(),
  }),

  /**
   * Update due date
   */
  updateDueDate: (todo: Todo, dueDate: Date | undefined): Todo => ({
    ...todo,
    dueDate,
    updatedAt: new Date(),
  }),

  /**
   * Update order
   */
  updateOrder: (todo: Todo, order: number): Todo => ({
    ...todo,
    order,
    updatedAt: new Date(),
  }),

  /**
   * Check if todo is overdue
   */
  isOverdue: (todo: Todo): boolean => {
    if (!todo.dueDate || TodoStatus.isClosed(todo.status)) {
      return false;
    }
    return new Date() > todo.dueDate;
  },

  /**
   * Check if todo is completed
   */
  isCompleted: (todo: Todo): boolean => {
    return todo.status === 'completed';
  },

  /**
   * Check if todo is actionable
   */
  isActionable: (todo: Todo): boolean => {
    return TodoStatus.isActionable(todo.status);
  },
} as const;
