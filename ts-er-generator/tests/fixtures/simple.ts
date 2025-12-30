/**
 * Simple test fixtures for basic interface/type parsing
 */

/** User entity */
interface User {
  /** @pk */
  id: string;
  name: string;
  email: string;
  age?: number;
}

/** Post entity */
interface Post {
  /** @pk */
  id: string;
  /** @fk */
  authorId: string;
  title: string;
  content: string;
  published: boolean;
}

/** Comment entity as type alias */
type Comment = {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: Date;
};
