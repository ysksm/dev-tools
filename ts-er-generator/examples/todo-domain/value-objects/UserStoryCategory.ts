/**
 * UserStory category value object
 */
export type UserStoryCategory = 'feature' | 'bug' | 'tech_debt' | 'spike' | 'chore';

export const UserStoryCategory = {
  /**
   * All valid categories
   */
  values: ['feature', 'bug', 'tech_debt', 'spike', 'chore'] as const,

  /**
   * Create category from string
   */
  create: (value: string): UserStoryCategory => {
    if (!UserStoryCategory.isValid(value)) {
      throw new Error(`Invalid UserStoryCategory: ${value}`);
    }
    return value as UserStoryCategory;
  },

  /**
   * Check if value is valid category
   */
  isValid: (value: string): value is UserStoryCategory => {
    return UserStoryCategory.values.includes(value as UserStoryCategory);
  },

  /**
   * Get display label for category
   */
  toLabel: (category: UserStoryCategory): string => {
    const labels: Record<UserStoryCategory, string> = {
      feature: 'Feature',
      bug: 'Bug Fix',
      tech_debt: 'Tech Debt',
      spike: 'Spike',
      chore: 'Chore',
    };
    return labels[category];
  },
} as const;
