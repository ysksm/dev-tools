/**
 * UserStory status value object
 */
export type UserStoryStatus =
  | 'backlog'
  | 'ready'
  | 'in_progress'
  | 'in_review'
  | 'done'
  | 'archived';

export const UserStoryStatus = {
  /**
   * All valid statuses
   */
  values: ['backlog', 'ready', 'in_progress', 'in_review', 'done', 'archived'] as const,

  /**
   * Create status from string
   */
  create: (value: string): UserStoryStatus => {
    if (!UserStoryStatus.isValid(value)) {
      throw new Error(`Invalid UserStoryStatus: ${value}`);
    }
    return value as UserStoryStatus;
  },

  /**
   * Check if value is valid status
   */
  isValid: (value: string): value is UserStoryStatus => {
    return UserStoryStatus.values.includes(value as UserStoryStatus);
  },

  /**
   * Check if story can transition to target status
   */
  canTransitionTo: (from: UserStoryStatus, to: UserStoryStatus): boolean => {
    const transitions: Record<UserStoryStatus, UserStoryStatus[]> = {
      backlog: ['ready', 'archived'],
      ready: ['backlog', 'in_progress', 'archived'],
      in_progress: ['ready', 'in_review', 'archived'],
      in_review: ['in_progress', 'done', 'archived'],
      done: ['archived'],
      archived: ['backlog'],
    };
    return transitions[from].includes(to);
  },

  /**
   * Check if status is terminal
   */
  isTerminal: (status: UserStoryStatus): boolean => {
    return status === 'done' || status === 'archived';
  },
} as const;
