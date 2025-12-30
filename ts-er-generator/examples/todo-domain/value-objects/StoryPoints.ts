/**
 * Story points value object (Fibonacci scale)
 */
export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13 | 21;

export const StoryPoints = {
  /**
   * All valid story point values (Fibonacci)
   */
  values: [1, 2, 3, 5, 8, 13, 21] as const,

  /**
   * Create story points from number
   */
  create: (value: number): StoryPoints => {
    if (!StoryPoints.isValid(value)) {
      throw new Error(`Invalid StoryPoints: ${value}. Must be one of ${StoryPoints.values.join(', ')}`);
    }
    return value as StoryPoints;
  },

  /**
   * Check if value is valid story points
   */
  isValid: (value: number): value is StoryPoints => {
    return StoryPoints.values.includes(value as StoryPoints);
  },

  /**
   * Get size category
   */
  getSize: (points: StoryPoints): 'small' | 'medium' | 'large' | 'epic' => {
    if (points <= 2) return 'small';
    if (points <= 5) return 'medium';
    if (points <= 13) return 'large';
    return 'epic';
  },

  /**
   * Sum story points
   */
  sum: (points: StoryPoints[]): number => {
    return points.reduce((acc, p) => acc + p, 0);
  },
} as const;
