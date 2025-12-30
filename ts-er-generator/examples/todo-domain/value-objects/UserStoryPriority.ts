/**
 * UserStory priority value object
 */
export type UserStoryPriority = 'critical' | 'high' | 'medium' | 'low';

export const UserStoryPriority = {
  /**
   * All valid priorities (ordered by importance)
   */
  values: ['critical', 'high', 'medium', 'low'] as const,

  /**
   * Create priority from string
   */
  create: (value: string): UserStoryPriority => {
    if (!UserStoryPriority.isValid(value)) {
      throw new Error(`Invalid UserStoryPriority: ${value}`);
    }
    return value as UserStoryPriority;
  },

  /**
   * Check if value is valid priority
   */
  isValid: (value: string): value is UserStoryPriority => {
    return UserStoryPriority.values.includes(value as UserStoryPriority);
  },

  /**
   * Compare priorities (returns negative if a > b, positive if a < b)
   */
  compare: (a: UserStoryPriority, b: UserStoryPriority): number => {
    return UserStoryPriority.values.indexOf(a) - UserStoryPriority.values.indexOf(b);
  },

  /**
   * Check if priority is urgent
   */
  isUrgent: (priority: UserStoryPriority): boolean => {
    return priority === 'critical' || priority === 'high';
  },
} as const;
