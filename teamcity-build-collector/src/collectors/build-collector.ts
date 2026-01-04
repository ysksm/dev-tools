/**
 * Build Results Collector
 */

import { TeamCityClient, GetBuildsOptions } from '../api/client.js';
import type { Build, ProblemOccurrence, TestOccurrence } from '../models/teamcity.js';
import type {
  CollectedBuild,
  CollectedProblem,
  CollectedTestFailure,
  CollectorOptions,
} from '../models/analysis.js';

export interface CollectBuildsProgress {
  total: number;
  current: number;
  buildId: number;
  buildNumber: string;
  status: string;
}

export type ProgressCallback = (progress: CollectBuildsProgress) => void;

export class BuildCollector {
  constructor(private readonly client: TeamCityClient) {}

  async collect(
    options: CollectorOptions,
    onProgress?: ProgressCallback
  ): Promise<CollectedBuild[]> {
    const builds: CollectedBuild[] = [];
    const buildList = await this.fetchBuilds(options);

    for (let i = 0; i < buildList.length; i++) {
      const build = buildList[i];

      if (onProgress) {
        onProgress({
          total: buildList.length,
          current: i + 1,
          buildId: build.id,
          buildNumber: build.number,
          status: build.status,
        });
      }

      const collectedBuild = await this.collectBuildDetails(build);
      if (collectedBuild) {
        builds.push(collectedBuild);
      }
    }

    return builds;
  }

  async collectByBuildType(
    options: CollectorOptions,
    onProgress?: ProgressCallback
  ): Promise<Map<string, CollectedBuild[]>> {
    const builds = await this.collect(options, onProgress);
    const byBuildType = new Map<string, CollectedBuild[]>();

    for (const build of builds) {
      const list = byBuildType.get(build.buildTypeId) ?? [];
      list.push(build);
      byBuildType.set(build.buildTypeId, list);
    }

    return byBuildType;
  }

  private async fetchBuilds(options: CollectorOptions): Promise<Build[]> {
    const allBuilds: Build[] = [];
    const pageSize = 100;
    let start = 0;
    let hasMore = true;
    const maxCount = options.count ?? 1000;

    while (hasMore && allBuilds.length < maxCount) {
      const queryOptions: GetBuildsOptions = {
        projectId: options.projectId,
        sinceDate: options.fromDate,
        untilDate: options.toDate,
        branch: options.branch,
        count: Math.min(pageSize, maxCount - allBuilds.length),
        start,
        running: options.includeRunning ?? false,
        canceled: options.includeCanceled ?? false,
      };

      // If specific build types are specified, fetch for each
      if (options.buildTypeIds && options.buildTypeIds.length > 0) {
        for (const buildTypeId of options.buildTypeIds) {
          const response = await this.client.getBuilds({
            ...queryOptions,
            buildTypeId,
          });
          if (response.build) {
            allBuilds.push(...response.build);
          }
        }
        hasMore = false; // Don't paginate when fetching by build type
      } else {
        const response = await this.client.getBuilds(queryOptions);
        if (response.build && response.build.length > 0) {
          allBuilds.push(...response.build);
          start += pageSize;
          hasMore = response.build.length === pageSize;
        } else {
          hasMore = false;
        }
      }
    }

    // Sort by start date descending
    return allBuilds.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });
  }

  private async collectBuildDetails(build: Build): Promise<CollectedBuild | null> {
    try {
      // Get detailed build info
      const detailedBuild = await this.client.getBuildWithDetails(build.id);

      // Collect problems and failed tests for failed builds
      let problems: CollectedProblem[] = [];
      let failedTests: CollectedTestFailure[] = [];

      if (detailedBuild.status === 'FAILURE' || detailedBuild.status === 'ERROR') {
        problems = await this.collectProblems(build.id);
        failedTests = await this.collectFailedTests(build.id);
      }

      return this.toCollectedBuild(detailedBuild, problems, failedTests);
    } catch (error) {
      console.error(`Failed to collect details for build ${build.id}:`, error);
      return null;
    }
  }

  private async collectProblems(buildId: number): Promise<CollectedProblem[]> {
    try {
      const response = await this.client.getBuildProblems(buildId);
      if (!response.problemOccurrence) {
        return [];
      }

      return response.problemOccurrence.map((p) => this.toCollectedProblem(p));
    } catch {
      return [];
    }
  }

  private async collectFailedTests(buildId: number): Promise<CollectedTestFailure[]> {
    try {
      const response = await this.client.getAllFailedTests(buildId);
      if (!response.testOccurrence) {
        return [];
      }

      return response.testOccurrence.map((t) => this.toCollectedTestFailure(t));
    } catch {
      return [];
    }
  }

  private toCollectedBuild(
    build: Build,
    problems: CollectedProblem[],
    failedTests: CollectedTestFailure[]
  ): CollectedBuild {
    const startDate = build.startDate ? this.parseTeamCityDate(build.startDate) : new Date();
    const finishDate = build.finishDate ? this.parseTeamCityDate(build.finishDate) : new Date();
    const duration = finishDate.getTime() - startDate.getTime();

    return {
      id: build.id,
      buildTypeId: build.buildTypeId,
      buildTypeName: build.buildType?.name ?? build.buildTypeId,
      projectName: build.buildType?.projectName ?? '',
      number: build.number,
      status: build.status,
      statusText: build.statusText,
      branchName: build.branchName,
      startDate,
      finishDate,
      duration,
      agentName: build.agent?.name,
      triggeredBy: build.triggered?.user?.name ?? build.triggered?.user?.username,
      triggerType: build.triggered?.type,
      webUrl: build.webUrl,
      problems,
      failedTests,
    };
  }

  private toCollectedProblem(problem: ProblemOccurrence): CollectedProblem {
    return {
      id: problem.id,
      type: problem.type,
      identity: problem.identity,
      details: problem.details,
      isNew: problem.newFailure ?? false,
    };
  }

  private toCollectedTestFailure(test: TestOccurrence): CollectedTestFailure {
    return {
      id: test.id,
      name: test.name,
      duration: test.duration,
      details: test.details,
      isNew: test.newFailure ?? false,
      isMuted: test.muted ?? test.currentlyMuted ?? false,
    };
  }

  private parseTeamCityDate(dateStr: string): Date {
    // TeamCity date format: yyyyMMddTHHmmss+0000
    // Example: 20240115T143022+0000
    const match = dateStr.match(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})([+-]\d{4})$/
    );
    if (!match) {
      return new Date(dateStr);
    }

    const [, year, month, day, hour, minute, second, timezone] = match;
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}${timezone.slice(0, 3)}:${timezone.slice(3)}`;
    return new Date(isoString);
  }
}
