/**
 * User ID value object (branded type)
 * @pk
 */
export type UserId = string & { readonly __brand: unique symbol };

export const UserId = {
  /**
   * Create UserId from existing string
   */
  create: (value: string): UserId => {
    if (!value || value.trim().length === 0) {
      throw new Error('UserId cannot be empty');
    }
    return value as UserId;
  },

  /**
   * Generate new UserId
   */
  generate: (): UserId => {
    return crypto.randomUUID() as UserId;
  },

  /**
   * Check equality
   */
  equals: (a: UserId, b: UserId): boolean => a === b,
} as const;
