/**
 * Complex test fixtures for advanced parsing scenarios
 */

/** Base entity with common fields */
interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/** User with relationships */
interface User extends BaseEntity {
  name: string;
  email: string;
  profile?: Profile;
  posts: Post[];
  comments: Comment[];
}

/** User profile */
interface Profile {
  id: string;
  userId: string;
  bio: string;
  avatar?: string;
}

/** Blog post */
interface Post extends BaseEntity {
  author: User;
  title: string;
  content: string;
  tags: Tag[];
  comments: Comment[];
  status: 'draft' | 'published' | 'archived';
}

/** Comment on a post */
interface Comment extends BaseEntity {
  post: Post;
  author: User;
  text: string;
  parentComment?: Comment;
  replies: Comment[];
}

/** Tag for categorization */
interface Tag {
  id: string;
  name: string;
  posts: Post[];
}

/** Generic container type */
interface Container<T> {
  data: T;
  metadata: Record<string, unknown>;
}

/** Nullable wrapper */
type Nullable<T> = T | null;

/** User list container */
type UserList = Container<User[]>;
