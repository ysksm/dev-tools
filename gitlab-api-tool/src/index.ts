/**
 * GitLab API Tool - Library Entry Point
 */

export { GitLabClient, createClientFromEnv } from "./client/index.js";
export type {
  GitLabConfig,
  GitLabProject,
  GitLabUser,
  GitLabMergeRequest,
  ProjectListOptions,
  MergeRequestListOptions,
} from "./types/index.js";
