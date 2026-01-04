/**
 * TeamCity REST API Client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  BuildsResponse,
  BuildTypesResponse,
  Build,
  BuildType,
  ProblemOccurrencesResponse,
  TestOccurrencesResponse,
  ProjectsResponse,
  Project,
} from '../models/teamcity.js';

export interface TeamCityClientConfig {
  serverUrl: string;
  authToken?: string;
  username?: string;
  password?: string;
  timeout?: number;
}

export class TeamCityClient {
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor(config: TeamCityClientConfig) {
    this.baseUrl = config.serverUrl.replace(/\/$/, '');

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Token authentication (preferred)
    if (config.authToken) {
      headers['Authorization'] = `Bearer ${config.authToken}`;
    }

    this.client = axios.create({
      baseURL: `${this.baseUrl}/app/rest`,
      headers,
      timeout: config.timeout ?? 30000,
      // Basic authentication
      auth: config.username && config.password
        ? { username: config.username, password: config.password }
        : undefined,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          const message = this.extractErrorMessage(error);

          if (status === 401) {
            throw new Error(`Authentication failed: ${message}`);
          }
          if (status === 403) {
            throw new Error(`Access denied: ${message}`);
          }
          if (status === 404) {
            throw new Error(`Resource not found: ${message}`);
          }
          throw new Error(`API error (${status}): ${message}`);
        }
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Cannot connect to TeamCity server at ${this.baseUrl}`);
        }
        throw error;
      }
    );
  }

  private extractErrorMessage(error: AxiosError): string {
    const data = error.response?.data;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object' && 'message' in data) {
      return (data as { message: string }).message;
    }
    return error.message;
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    const response = await this.client.get<ProjectsResponse>('/projects');
    return response.data.project ?? [];
  }

  async getProject(projectId: string): Promise<Project> {
    const response = await this.client.get<Project>(`/projects/id:${projectId}`);
    return response.data;
  }

  // Build Types (ビルド定義)
  async getBuildTypes(projectId?: string): Promise<BuildType[]> {
    const locator = projectId ? `?locator=project:${projectId}` : '';
    const response = await this.client.get<BuildTypesResponse>(`/buildTypes${locator}`);
    return response.data.buildType ?? [];
  }

  async getBuildType(buildTypeId: string): Promise<BuildType> {
    const response = await this.client.get<BuildType>(`/buildTypes/id:${buildTypeId}`);
    return response.data;
  }

  // Builds (ビルド結果)
  async getBuilds(options: GetBuildsOptions = {}): Promise<BuildsResponse> {
    const locatorParts: string[] = [];

    if (options.buildTypeId) {
      locatorParts.push(`buildType:${options.buildTypeId}`);
    }
    if (options.projectId) {
      locatorParts.push(`project:${options.projectId}`);
    }
    if (options.status) {
      locatorParts.push(`status:${options.status}`);
    }
    if (options.state) {
      locatorParts.push(`state:${options.state}`);
    }
    if (options.branch) {
      locatorParts.push(`branch:${options.branch}`);
    }
    if (options.sinceDate) {
      locatorParts.push(`sinceDate:${this.formatDate(options.sinceDate)}`);
    }
    if (options.untilDate) {
      locatorParts.push(`untilDate:${this.formatDate(options.untilDate)}`);
    }
    if (options.count) {
      locatorParts.push(`count:${options.count}`);
    }
    if (options.start !== undefined) {
      locatorParts.push(`start:${options.start}`);
    }
    if (options.running !== undefined) {
      locatorParts.push(`running:${options.running}`);
    }
    if (options.canceled !== undefined) {
      locatorParts.push(`canceled:${options.canceled}`);
    }

    // Default to finished builds only
    if (!options.running && !options.state) {
      locatorParts.push('state:finished');
    }

    const locator = locatorParts.length > 0 ? `?locator=${locatorParts.join(',')}` : '';
    const fields = options.fields ? `${locator ? '&' : '?'}fields=${options.fields}` : '';

    const response = await this.client.get<BuildsResponse>(`/builds${locator}${fields}`);
    return response.data;
  }

  async getBuild(buildId: number): Promise<Build> {
    const response = await this.client.get<Build>(`/builds/id:${buildId}`);
    return response.data;
  }

  async getBuildWithDetails(buildId: number): Promise<Build> {
    const fields = 'build(id,buildTypeId,number,status,state,statusText,branchName,defaultBranch,' +
      'startDate,finishDate,queuedDate,webUrl,href,' +
      'agent(id,name),' +
      'triggered(type,date,user(username,name)),' +
      'lastChanges(change(id,version,username,date,comment)),' +
      'problemOccurrences(count,href),' +
      'testOccurrences(count,href,passed,failed,newFailed,ignored,muted),' +
      'buildType(id,name,projectName,projectId))';

    const response = await this.client.get<Build>(
      `/builds/id:${buildId}?fields=${fields}`
    );
    return response.data;
  }

  // Problem Occurrences (ビルド問題)
  async getBuildProblems(buildId: number): Promise<ProblemOccurrencesResponse> {
    const response = await this.client.get<ProblemOccurrencesResponse>(
      `/problemOccurrences?locator=build:(id:${buildId})&fields=problemOccurrence(id,type,identity,details,additionalData,newFailure,muted,currentlyMuted,currentlyInvestigated,problem(id,type,identity))`
    );
    return response.data;
  }

  // Test Occurrences (テスト結果)
  async getFailedTests(
    buildId: number,
    options: { count?: number; start?: number } = {}
  ): Promise<TestOccurrencesResponse> {
    const count = options.count ?? 100;
    const start = options.start ?? 0;

    const response = await this.client.get<TestOccurrencesResponse>(
      `/testOccurrences?locator=build:(id:${buildId}),status:FAILURE,count:${count},start:${start}` +
      `&fields=testOccurrence(id,name,status,duration,details,newFailure,muted,currentlyMuted,currentlyInvestigated,test(id,name),build(id,buildTypeId))`
    );
    return response.data;
  }

  async getAllFailedTests(buildId: number): Promise<TestOccurrencesResponse> {
    const allTests: TestOccurrencesResponse = {
      count: 0,
      href: '',
      testOccurrence: [],
    };

    let start = 0;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const page = await this.getFailedTests(buildId, { count: pageSize, start });
      if (page.testOccurrence && page.testOccurrence.length > 0) {
        allTests.testOccurrence.push(...page.testOccurrence);
        allTests.count += page.testOccurrence.length;
        start += pageSize;
        hasMore = page.testOccurrence.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    return allTests;
  }

  // Statistics
  async getBuildStatistics(buildId: number): Promise<Record<string, string>> {
    const response = await this.client.get<{ property: { name: string; value: string }[] }>(
      `/builds/id:${buildId}/statistics`
    );
    const stats: Record<string, string> = {};
    for (const prop of response.data.property ?? []) {
      stats[prop.name] = prop.value;
    }
    return stats;
  }

  // Utility
  private formatDate(date: Date): string {
    // TeamCity uses format: yyyyMMddTHHmmss+0000
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    const seconds = pad(date.getUTCSeconds());
    return `${year}${month}${day}T${hours}${minutes}${seconds}+0000`;
  }

  // Health check
  async checkConnection(): Promise<boolean> {
    try {
      await this.client.get('/server');
      return true;
    } catch {
      return false;
    }
  }
}

export interface GetBuildsOptions {
  buildTypeId?: string;
  projectId?: string;
  status?: 'SUCCESS' | 'FAILURE' | 'ERROR';
  state?: 'queued' | 'running' | 'finished';
  branch?: string;
  sinceDate?: Date;
  untilDate?: Date;
  count?: number;
  start?: number;
  running?: boolean;
  canceled?: boolean;
  fields?: string;
}
