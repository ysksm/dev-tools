import { UserStory } from '../entities/UserStory.ts';
import { Todo } from '../entities/Todo.ts';
import { UserStoryId } from '../value-objects/UserStoryId.ts';
import { TodoId } from '../value-objects/TodoId.ts';
import { UserId } from '../value-objects/UserId.ts';
import { UserStoryStatus } from '../value-objects/UserStoryStatus.ts';
import { TodoStatus } from '../value-objects/TodoStatus.ts';
import { TodoPriority } from '../value-objects/TodoPriority.ts';

/**
 * UserStory Aggregate - UserStory with its Todos
 */
export interface UserStoryAggregate {
  readonly userStory: UserStory;
  readonly todos: readonly Todo[];
}

export const UserStoryAggregate = {
  /**
   * Create a new UserStoryAggregate
   */
  create: (userStory: UserStory, todos: Todo[] = []): UserStoryAggregate => ({
    userStory,
    todos,
  }),

  /**
   * Add a new todo to the aggregate
   */
  addTodo: (
    aggregate: UserStoryAggregate,
    props: {
      title: string;
      description?: string;
      priority?: TodoPriority;
      assigneeId?: UserId;
      estimatedMinutes?: number;
      dueDate?: Date;
    }
  ): UserStoryAggregate => {
    const maxOrder = aggregate.todos.reduce(
      (max, todo) => Math.max(max, todo.order),
      -1
    );

    const newTodo = Todo.create({
      ...props,
      userStoryId: aggregate.userStory.id,
      order: maxOrder + 1,
    });

    return {
      ...aggregate,
      todos: [...aggregate.todos, newTodo],
    };
  },

  /**
   * Update a todo within the aggregate
   */
  updateTodo: (
    aggregate: UserStoryAggregate,
    todoId: TodoId,
    updater: (todo: Todo) => Todo
  ): UserStoryAggregate => {
    const todoIndex = aggregate.todos.findIndex((t) =>
      TodoId.equals(t.id, todoId)
    );
    if (todoIndex === -1) {
      throw new Error(`Todo not found: ${todoId}`);
    }

    const updatedTodo = updater(aggregate.todos[todoIndex]);
    const newTodos = [...aggregate.todos];
    newTodos[todoIndex] = updatedTodo;

    return {
      ...aggregate,
      todos: newTodos,
    };
  },

  /**
   * Remove a todo from the aggregate
   */
  removeTodo: (
    aggregate: UserStoryAggregate,
    todoId: TodoId
  ): UserStoryAggregate => ({
    ...aggregate,
    todos: aggregate.todos.filter((t) => !TodoId.equals(t.id, todoId)),
  }),

  /**
   * Reorder todos
   */
  reorderTodos: (
    aggregate: UserStoryAggregate,
    todoIds: TodoId[]
  ): UserStoryAggregate => {
    const todoMap = new Map(aggregate.todos.map((t) => [t.id, t]));
    const reorderedTodos = todoIds
      .map((id, index) => {
        const todo = todoMap.get(id);
        if (!todo) return null;
        return Todo.updateOrder(todo, index);
      })
      .filter((t): t is Todo => t !== null);

    return {
      ...aggregate,
      todos: reorderedTodos,
    };
  },

  /**
   * Start the user story (move to in_progress)
   */
  start: (aggregate: UserStoryAggregate): UserStoryAggregate => {
    if (aggregate.userStory.status !== 'ready') {
      throw new Error('UserStory must be in ready status to start');
    }

    return {
      ...aggregate,
      userStory: UserStory.transitionTo(aggregate.userStory, 'in_progress'),
    };
  },

  /**
   * Complete the user story if all todos are done
   */
  tryComplete: (aggregate: UserStoryAggregate): UserStoryAggregate => {
    const allTodosCompleted = aggregate.todos.every(
      (todo) => TodoStatus.isClosed(todo.status)
    );

    if (!allTodosCompleted) {
      throw new Error('All todos must be completed before completing the story');
    }

    const inReview = UserStory.transitionTo(aggregate.userStory, 'in_review');
    return {
      ...aggregate,
      userStory: inReview,
    };
  },

  /**
   * Approve and complete the user story
   */
  approve: (aggregate: UserStoryAggregate): UserStoryAggregate => {
    if (aggregate.userStory.status !== 'in_review') {
      throw new Error('UserStory must be in review to approve');
    }

    return {
      ...aggregate,
      userStory: UserStory.transitionTo(aggregate.userStory, 'done'),
    };
  },

  /**
   * Get progress statistics
   */
  getProgress: (aggregate: UserStoryAggregate): {
    totalTodos: number;
    completedTodos: number;
    pendingTodos: number;
    blockedTodos: number;
    progressPercent: number;
    totalEstimatedMinutes: number;
    totalActualMinutes: number;
  } => {
    const totalTodos = aggregate.todos.length;
    const completedTodos = aggregate.todos.filter((t) =>
      TodoStatus.isClosed(t.status)
    ).length;
    const pendingTodos = aggregate.todos.filter(
      (t) => t.status === 'pending' || t.status === 'in_progress'
    ).length;
    const blockedTodos = aggregate.todos.filter(
      (t) => t.status === 'blocked'
    ).length;

    const progressPercent =
      totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

    const totalEstimatedMinutes = aggregate.todos.reduce(
      (sum, t) => sum + (t.estimatedMinutes ?? 0),
      0
    );
    const totalActualMinutes = aggregate.todos.reduce(
      (sum, t) => sum + (t.actualMinutes ?? 0),
      0
    );

    return {
      totalTodos,
      completedTodos,
      pendingTodos,
      blockedTodos,
      progressPercent,
      totalEstimatedMinutes,
      totalActualMinutes,
    };
  },

  /**
   * Get todos sorted by order
   */
  getSortedTodos: (aggregate: UserStoryAggregate): Todo[] => {
    return [...aggregate.todos].sort((a, b) => a.order - b.order);
  },

  /**
   * Get todos by status
   */
  getTodosByStatus: (
    aggregate: UserStoryAggregate,
    status: TodoStatus
  ): Todo[] => {
    return aggregate.todos.filter((t) => t.status === status);
  },

  /**
   * Check if aggregate has blocked todos
   */
  hasBlockedTodos: (aggregate: UserStoryAggregate): boolean => {
    return aggregate.todos.some((t) => t.status === 'blocked');
  },

  /**
   * Check if aggregate has overdue todos
   */
  hasOverdueTodos: (aggregate: UserStoryAggregate): boolean => {
    return aggregate.todos.some((t) => Todo.isOverdue(t));
  },
} as const;
