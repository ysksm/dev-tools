/**
 * GitLab API Types
 */

export interface GitLabConfig {
  baseUrl: string;
  privateToken: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  description: string | null;
  web_url: string;
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  default_branch: string;
  visibility: "private" | "internal" | "public";
  created_at: string;
  last_activity_at: string;
  archived: boolean;
  star_count: number;
  forks_count: number;
  open_issues_count: number;
  namespace: {
    id: number;
    name: string;
    path: string;
    kind: string;
    full_path: string;
  };
}

export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url: string;
  web_url: string;
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  state: "opened" | "closed" | "merged" | "locked";
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  closed_at: string | null;
  source_branch: string;
  target_branch: string;
  web_url: string;
  author: GitLabUser;
  assignee: GitLabUser | null;
  assignees: GitLabUser[];
  reviewers: GitLabUser[];
  draft: boolean;
  work_in_progress: boolean;
  merge_status: string;
  has_conflicts: boolean;
  labels: string[];
  project_id: number;
}

export interface ProjectListOptions {
  owned?: boolean;
  membership?: boolean;
  starred?: boolean;
  search?: string;
  visibility?: "private" | "internal" | "public";
  archived?: boolean;
  orderBy?: "id" | "name" | "path" | "created_at" | "updated_at" | "last_activity_at";
  sort?: "asc" | "desc";
  perPage?: number;
  page?: number;
}

export interface MergeRequestListOptions {
  projectId?: number | string;
  state?: "opened" | "closed" | "merged" | "locked" | "all";
  scope?: "created_by_me" | "assigned_to_me" | "all";
  authorId?: number;
  assigneeId?: number;
  reviewerId?: number;
  search?: string;
  labels?: string[];
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  orderBy?: "created_at" | "updated_at";
  sort?: "asc" | "desc";
  perPage?: number;
  page?: number;
}
