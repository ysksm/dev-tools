/**
 * GitLab API Client
 */

import type {
  GitLabConfig,
  GitLabProject,
  GitLabMergeRequest,
  ProjectListOptions,
  MergeRequestListOptions,
} from "../types/index.js";

export class GitLabClient {
  private baseUrl: string;
  private privateToken: string;

  constructor(config: GitLabConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.privateToken = config.privateToken;
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v4${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(this.toSnakeCase(key), String(value));
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        "PRIVATE-TOKEN": this.privateToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitLab API Error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Get list of projects
   */
  async listProjects(options: ProjectListOptions = {}): Promise<GitLabProject[]> {
    return this.request<GitLabProject[]>("/projects", {
      owned: options.owned,
      membership: options.membership,
      starred: options.starred,
      search: options.search,
      visibility: options.visibility,
      archived: options.archived,
      orderBy: options.orderBy,
      sort: options.sort,
      perPage: options.perPage ?? 20,
      page: options.page ?? 1,
    });
  }

  /**
   * Get a single project by ID or path
   */
  async getProject(projectId: number | string): Promise<GitLabProject> {
    const encodedId =
      typeof projectId === "string" ? encodeURIComponent(projectId) : projectId;
    return this.request<GitLabProject>(`/projects/${encodedId}`);
  }

  /**
   * Get list of merge requests
   * If projectId is provided, returns MRs for that project only
   */
  async listMergeRequests(
    options: MergeRequestListOptions = {}
  ): Promise<GitLabMergeRequest[]> {
    const { projectId, ...otherOptions } = options;

    const endpoint = projectId
      ? `/projects/${encodeURIComponent(projectId)}/merge_requests`
      : "/merge_requests";

    return this.request<GitLabMergeRequest[]>(endpoint, {
      state: otherOptions.state ?? "opened",
      scope: otherOptions.scope,
      authorId: otherOptions.authorId,
      assigneeId: otherOptions.assigneeId,
      reviewerId: otherOptions.reviewerId,
      search: otherOptions.search,
      labels: otherOptions.labels?.join(","),
      createdAfter: otherOptions.createdAfter,
      createdBefore: otherOptions.createdBefore,
      updatedAfter: otherOptions.updatedAfter,
      updatedBefore: otherOptions.updatedBefore,
      orderBy: otherOptions.orderBy,
      sort: otherOptions.sort,
      perPage: otherOptions.perPage ?? 20,
      page: otherOptions.page ?? 1,
    });
  }

  /**
   * Get a single merge request
   */
  async getMergeRequest(
    projectId: number | string,
    mrIid: number
  ): Promise<GitLabMergeRequest> {
    const encodedProjectId =
      typeof projectId === "string" ? encodeURIComponent(projectId) : projectId;
    return this.request<GitLabMergeRequest>(
      `/projects/${encodedProjectId}/merge_requests/${mrIid}`
    );
  }
}

/**
 * Create a GitLab client from environment variables
 */
export function createClientFromEnv(): GitLabClient {
  const baseUrl = process.env.GITLAB_URL;
  const privateToken = process.env.GITLAB_TOKEN;

  if (!baseUrl) {
    throw new Error("GITLAB_URL environment variable is required");
  }

  if (!privateToken) {
    throw new Error("GITLAB_TOKEN environment variable is required");
  }

  return new GitLabClient({ baseUrl, privateToken });
}
