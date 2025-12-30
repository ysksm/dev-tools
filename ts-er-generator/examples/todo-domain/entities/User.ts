import { UserId } from '../value-objects/UserId.ts';

/**
 * User entity
 */
export interface User {
  /** @pk */
  readonly id: UserId;
  readonly name: string;
  readonly email: string;
  readonly avatarUrl?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const User = {
  /**
   * Create a new User
   */
  create: (props: {
    id?: UserId;
    name: string;
    email: string;
    avatarUrl?: string;
  }): User => {
    const now = new Date();
    return {
      id: props.id ?? UserId.generate(),
      name: props.name,
      email: props.email,
      avatarUrl: props.avatarUrl,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Reconstruct User from persistence
   */
  reconstruct: (props: {
    id: UserId;
    name: string;
    email: string;
    avatarUrl?: string;
    createdAt: Date;
    updatedAt: Date;
  }): User => ({
    id: props.id,
    name: props.name,
    email: props.email,
    avatarUrl: props.avatarUrl,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  }),

  /**
   * Update user name
   */
  updateName: (user: User, name: string): User => ({
    ...user,
    name,
    updatedAt: new Date(),
  }),

  /**
   * Update user email
   */
  updateEmail: (user: User, email: string): User => ({
    ...user,
    email,
    updatedAt: new Date(),
  }),

  /**
   * Update avatar URL
   */
  updateAvatar: (user: User, avatarUrl: string | undefined): User => ({
    ...user,
    avatarUrl,
    updatedAt: new Date(),
  }),
} as const;
