import { UserStoryId } from '../value-objects/UserStoryId.ts';
import { UserId } from '../value-objects/UserId.ts';
import { UserStoryStatus } from '../value-objects/UserStoryStatus.ts';
import { UserStoryPriority } from '../value-objects/UserStoryPriority.ts';
import { UserStoryCategory } from '../value-objects/UserStoryCategory.ts';
import { StoryPoints } from '../value-objects/StoryPoints.ts';

/**
 * UserStory entity - represents a unit of work from user perspective
 */
export interface UserStory {
  /** @pk */
  readonly id: UserStoryId;
  readonly title: string;
  readonly description: string;
  readonly acceptanceCriteria: string[];
  readonly status: UserStoryStatus;
  readonly priority: UserStoryPriority;
  readonly category: UserStoryCategory;
  readonly storyPoints?: StoryPoints;
  /** @fk - assigned to User */
  readonly assigneeId?: UserId;
  /** @fk - reported by User */
  readonly reporterId: UserId;
  readonly tags: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly completedAt?: Date;
}

export const UserStory = {
  /**
   * Create a new UserStory
   */
  create: (props: {
    id?: UserStoryId;
    title: string;
    description: string;
    acceptanceCriteria?: string[];
    priority?: UserStoryPriority;
    category?: UserStoryCategory;
    storyPoints?: StoryPoints;
    reporterId: UserId;
    tags?: string[];
  }): UserStory => {
    const now = new Date();
    return {
      id: props.id ?? UserStoryId.generate(),
      title: props.title,
      description: props.description,
      acceptanceCriteria: props.acceptanceCriteria ?? [],
      status: 'backlog',
      priority: props.priority ?? 'medium',
      category: props.category ?? 'feature',
      storyPoints: props.storyPoints,
      assigneeId: undefined,
      reporterId: props.reporterId,
      tags: props.tags ?? [],
      createdAt: now,
      updatedAt: now,
      completedAt: undefined,
    };
  },

  /**
   * Reconstruct UserStory from persistence
   */
  reconstruct: (props: UserStory): UserStory => ({ ...props }),

  /**
   * Update title and description
   */
  updateContent: (
    story: UserStory,
    props: { title?: string; description?: string }
  ): UserStory => ({
    ...story,
    title: props.title ?? story.title,
    description: props.description ?? story.description,
    updatedAt: new Date(),
  }),

  /**
   * Update acceptance criteria
   */
  updateAcceptanceCriteria: (
    story: UserStory,
    acceptanceCriteria: string[]
  ): UserStory => ({
    ...story,
    acceptanceCriteria,
    updatedAt: new Date(),
  }),

  /**
   * Transition to new status
   */
  transitionTo: (story: UserStory, newStatus: UserStoryStatus): UserStory => {
    if (!UserStoryStatus.canTransitionTo(story.status, newStatus)) {
      throw new Error(
        `Cannot transition from ${story.status} to ${newStatus}`
      );
    }

    const now = new Date();
    return {
      ...story,
      status: newStatus,
      updatedAt: now,
      completedAt: newStatus === 'done' ? now : story.completedAt,
    };
  },

  /**
   * Update priority
   */
  updatePriority: (story: UserStory, priority: UserStoryPriority): UserStory => ({
    ...story,
    priority,
    updatedAt: new Date(),
  }),

  /**
   * Estimate story points
   */
  estimate: (story: UserStory, storyPoints: StoryPoints): UserStory => ({
    ...story,
    storyPoints,
    updatedAt: new Date(),
  }),

  /**
   * Assign to user
   */
  assignTo: (story: UserStory, assigneeId: UserId): UserStory => ({
    ...story,
    assigneeId,
    updatedAt: new Date(),
  }),

  /**
   * Unassign from user
   */
  unassign: (story: UserStory): UserStory => ({
    ...story,
    assigneeId: undefined,
    updatedAt: new Date(),
  }),

  /**
   * Add tag
   */
  addTag: (story: UserStory, tag: string): UserStory => {
    if (story.tags.includes(tag)) return story;
    return {
      ...story,
      tags: [...story.tags, tag],
      updatedAt: new Date(),
    };
  },

  /**
   * Remove tag
   */
  removeTag: (story: UserStory, tag: string): UserStory => ({
    ...story,
    tags: story.tags.filter((t) => t !== tag),
    updatedAt: new Date(),
  }),

  /**
   * Check if story is completed
   */
  isCompleted: (story: UserStory): boolean => {
    return UserStoryStatus.isTerminal(story.status);
  },

  /**
   * Check if story can be worked on
   */
  isWorkable: (story: UserStory): boolean => {
    return story.status === 'ready' || story.status === 'in_progress';
  },
} as const;
