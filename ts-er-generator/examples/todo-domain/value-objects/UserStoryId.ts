/**
 * UserStory ID value object (branded type)
 * @pk
 */
export type UserStoryId = string & { readonly __brand: unique symbol };

export const UserStoryId = {
  /**
   * Create UserStoryId from existing string
   */
  create: (value: string): UserStoryId => {
    if (!value || value.trim().length === 0) {
      throw new Error('UserStoryId cannot be empty');
    }
    return value as UserStoryId;
  },

  /**
   * Generate new UserStoryId
   */
  generate: (): UserStoryId => {
    return crypto.randomUUID() as UserStoryId;
  },

  /**
   * Check equality
   */
  equals: (a: UserStoryId, b: UserStoryId): boolean => a === b,
} as const;
