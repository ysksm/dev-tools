/**
 * Build Failure Analyzer
 */

import type {
  CollectedBuild,
  BuildTypeStats,
  OverallStats,
  FailureSummary,
  ProblemFrequency,
  FlakyTest,
  Recommendation,
  RecommendationType,
  Priority,
} from '../models/analysis.js';

export interface AnalyzerOptions {
  flakyTestThreshold?: number; // Default: 0.2 (20%)
  slowBuildThreshold?: number; // Default: 1.5x average
  highFailureRateThreshold?: number; // Default: 0.3 (30%)
  topCount?: number; // Default: 10
}

const DEFAULT_OPTIONS: Required<AnalyzerOptions> = {
  flakyTestThreshold: 0.2,
  slowBuildThreshold: 1.5,
  highFailureRateThreshold: 0.3,
  topCount: 10,
};

export class BuildAnalyzer {
  private readonly options: Required<AnalyzerOptions>;

  constructor(options: AnalyzerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  analyze(builds: CollectedBuild[]): OverallStats {
    if (builds.length === 0) {
      return this.emptyStats();
    }

    // Group builds by build type
    const byBuildType = this.groupByBuildType(builds);

    // Calculate stats for each build type
    const buildTypeStats: BuildTypeStats[] = [];
    for (const [, typeBuilds] of byBuildType) {
      const stats = this.analyzeBuildType(typeBuilds);
      buildTypeStats.push(stats);
    }

    // Calculate overall stats
    const totalBuilds = builds.length;
    const successCount = builds.filter((b) => b.status === 'SUCCESS').length;
    const failureCount = builds.filter((b) => b.status === 'FAILURE').length;
    const errorCount = builds.filter((b) => b.status === 'ERROR').length;
    const overallSuccessRate = totalBuilds > 0 ? successCount / totalBuilds : 0;
    const avgDuration = this.calculateAvgDuration(builds);

    // Get date range
    const dates = builds.map((b) => b.startDate.getTime());
    const from = new Date(Math.min(...dates));
    const to = new Date(Math.max(...dates));

    // Aggregate common problems across all build types
    const allProblems = this.aggregateProblems(buildTypeStats);
    const allFlakyTests = this.aggregateFlakyTests(buildTypeStats);

    // Top failing build types
    const topFailingBuildTypes = [...buildTypeStats]
      .filter((s) => s.failureCount > 0)
      .sort((a, b) => (1 - a.successRate) - (1 - b.successRate))
      .slice(0, this.options.topCount);

    return {
      period: { from, to },
      totalBuilds,
      successCount,
      failureCount,
      errorCount,
      overallSuccessRate,
      avgDuration,
      buildTypeStats,
      topFailingBuildTypes,
      topCommonProblems: allProblems.slice(0, this.options.topCount),
      topFlakyTests: allFlakyTests.slice(0, this.options.topCount),
    };
  }

  generateRecommendations(stats: OverallStats): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check for high failure rate build types
    for (const btStats of stats.buildTypeStats) {
      const failureRate = 1 - btStats.successRate;

      if (failureRate >= this.options.highFailureRateThreshold) {
        const priority: Priority = failureRate >= 0.5 ? 'HIGH' : 'MEDIUM';
        recommendations.push({
          type: 'HIGH_FAILURE_RATE',
          priority,
          buildTypeId: btStats.buildTypeId,
          buildTypeName: btStats.buildTypeName,
          message: `Build "${btStats.buildTypeName}" has a ${(failureRate * 100).toFixed(1)}% failure rate`,
          details: this.formatFailureDetails(btStats),
        });
      }
    }

    // Check for flaky tests
    for (const flakyTest of stats.topFlakyTests) {
      if (flakyTest.failureRate >= this.options.flakyTestThreshold) {
        const priority: Priority =
          flakyTest.failureRate >= 0.4 ? 'HIGH' : flakyTest.failureRate >= 0.25 ? 'MEDIUM' : 'LOW';
        recommendations.push({
          type: 'FLAKY_TEST',
          priority,
          message: `Flaky test detected: "${flakyTest.testName}"`,
          details: `Failure rate: ${(flakyTest.failureRate * 100).toFixed(1)}% (${flakyTest.failureCount}/${flakyTest.totalRuns} runs)`,
        });
      }
    }

    // Check for common problems
    for (const problem of stats.topCommonProblems.slice(0, 5)) {
      if (problem.count >= 3) {
        recommendations.push({
          type: 'COMMON_PROBLEM',
          priority: problem.count >= 10 ? 'HIGH' : problem.count >= 5 ? 'MEDIUM' : 'LOW',
          message: `Recurring problem: ${this.formatProblemType(problem.problemType)}`,
          details: `Occurred ${problem.count} times. Identity: ${problem.identity}`,
        });
      }
    }

    // Check for infrastructure issues (agent-related problems)
    const agentProblems = stats.topCommonProblems.filter(
      (p) =>
        p.problemType.includes('AGENT') ||
        p.problemType.includes('TIMEOUT') ||
        p.problemType.includes('OUT_OF_MEMORY')
    );
    for (const problem of agentProblems) {
      recommendations.push({
        type: 'INFRASTRUCTURE_ISSUE',
        priority: 'HIGH',
        message: `Infrastructure issue detected: ${this.formatProblemType(problem.problemType)}`,
        details: problem.details ?? `Occurred ${problem.count} times`,
      });
    }

    // Check for slow builds
    const slowBuilds = stats.buildTypeStats.filter(
      (s) => s.avgDuration > stats.avgDuration * this.options.slowBuildThreshold
    );
    for (const btStats of slowBuilds.slice(0, 3)) {
      recommendations.push({
        type: 'SLOW_BUILD',
        priority: 'LOW',
        buildTypeId: btStats.buildTypeId,
        buildTypeName: btStats.buildTypeName,
        message: `Build "${btStats.buildTypeName}" is slower than average`,
        details: `Average duration: ${this.formatDuration(btStats.avgDuration)} (overall avg: ${this.formatDuration(stats.avgDuration)})`,
      });
    }

    // Sort by priority
    const priorityOrder: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  private analyzeBuildType(builds: CollectedBuild[]): BuildTypeStats {
    if (builds.length === 0) {
      throw new Error('Cannot analyze empty build list');
    }

    const firstBuild = builds[0];
    const successCount = builds.filter((b) => b.status === 'SUCCESS').length;
    const failureCount = builds.filter((b) => b.status === 'FAILURE').length;
    const errorCount = builds.filter((b) => b.status === 'ERROR').length;
    const durations = builds.map((b) => b.duration).filter((d) => d > 0);

    // Recent failures
    const failedBuilds = builds
      .filter((b) => b.status === 'FAILURE' || b.status === 'ERROR')
      .slice(0, 10);
    const recentFailures = failedBuilds.map((b) => this.toFailureSummary(b));

    // Common problems
    const problemMap = new Map<string, ProblemFrequency>();
    for (const build of builds) {
      for (const problem of build.problems) {
        const key = `${problem.type}:${problem.identity}`;
        const existing = problemMap.get(key);
        if (existing) {
          existing.count++;
          if (build.startDate > existing.lastOccurrence) {
            existing.lastOccurrence = build.startDate;
          }
        } else {
          problemMap.set(key, {
            problemType: problem.type,
            identity: problem.identity,
            count: 1,
            lastOccurrence: build.startDate,
            details: problem.details,
          });
        }
      }
    }
    const commonProblems = [...problemMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Flaky tests (tests that fail sometimes but not always)
    const flakyTests = this.detectFlakyTests(builds);

    return {
      buildTypeId: firstBuild.buildTypeId,
      buildTypeName: firstBuild.buildTypeName,
      projectName: firstBuild.projectName,
      totalBuilds: builds.length,
      successCount,
      failureCount,
      errorCount,
      successRate: builds.length > 0 ? successCount / builds.length : 0,
      avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      recentFailures,
      commonProblems,
      flakyTests,
    };
  }

  private detectFlakyTests(builds: CollectedBuild[]): FlakyTest[] {
    const testStats = new Map<
      string,
      { totalRuns: number; failureCount: number; lastFailure?: Date }
    >();

    // Count test runs
    for (const build of builds) {
      const seenTests = new Set<string>();

      for (const test of build.failedTests) {
        if (!seenTests.has(test.name)) {
          seenTests.add(test.name);
          const stats = testStats.get(test.name) ?? {
            totalRuns: 0,
            failureCount: 0,
          };
          stats.failureCount++;
          stats.lastFailure = build.startDate;
          testStats.set(test.name, stats);
        }
      }
    }

    // Estimate total runs (assume test runs in every build)
    const totalBuilds = builds.length;
    const flakyTests: FlakyTest[] = [];

    for (const [testName, stats] of testStats) {
      // A test is flaky if it fails sometimes but not always
      const failureRate = stats.failureCount / totalBuilds;
      if (failureRate > 0 && failureRate < 1) {
        flakyTests.push({
          testName,
          totalRuns: totalBuilds,
          failureCount: stats.failureCount,
          failureRate,
          lastFailure: stats.lastFailure,
        });
      }
    }

    return flakyTests
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 20);
  }

  private toFailureSummary(build: CollectedBuild): FailureSummary {
    return {
      buildId: build.id,
      buildNumber: build.number,
      date: build.startDate,
      statusText: build.statusText,
      problems: build.problems.map(
        (p) => p.details ?? `${this.formatProblemType(p.type)}: ${p.identity}`
      ),
      failedTestCount: build.failedTests.length,
      webUrl: build.webUrl,
    };
  }

  private groupByBuildType(builds: CollectedBuild[]): Map<string, CollectedBuild[]> {
    const map = new Map<string, CollectedBuild[]>();
    for (const build of builds) {
      const list = map.get(build.buildTypeId) ?? [];
      list.push(build);
      map.set(build.buildTypeId, list);
    }
    return map;
  }

  private calculateAvgDuration(builds: CollectedBuild[]): number {
    const durations = builds.map((b) => b.duration).filter((d) => d > 0);
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }

  private aggregateProblems(buildTypeStats: BuildTypeStats[]): ProblemFrequency[] {
    const problemMap = new Map<string, ProblemFrequency>();

    for (const stats of buildTypeStats) {
      for (const problem of stats.commonProblems) {
        const key = `${problem.problemType}:${problem.identity}`;
        const existing = problemMap.get(key);
        if (existing) {
          existing.count += problem.count;
          if (problem.lastOccurrence > existing.lastOccurrence) {
            existing.lastOccurrence = problem.lastOccurrence;
          }
        } else {
          problemMap.set(key, { ...problem });
        }
      }
    }

    return [...problemMap.values()].sort((a, b) => b.count - a.count);
  }

  private aggregateFlakyTests(buildTypeStats: BuildTypeStats[]): FlakyTest[] {
    const testMap = new Map<string, FlakyTest>();

    for (const stats of buildTypeStats) {
      for (const test of stats.flakyTests) {
        const existing = testMap.get(test.testName);
        if (existing) {
          existing.totalRuns += test.totalRuns;
          existing.failureCount += test.failureCount;
          existing.failureRate = existing.failureCount / existing.totalRuns;
          if (test.lastFailure && (!existing.lastFailure || test.lastFailure > existing.lastFailure)) {
            existing.lastFailure = test.lastFailure;
          }
        } else {
          testMap.set(test.testName, { ...test });
        }
      }
    }

    return [...testMap.values()].sort((a, b) => b.failureRate - a.failureRate);
  }

  private formatFailureDetails(stats: BuildTypeStats): string {
    const lines: string[] = [];
    lines.push(`Total builds: ${stats.totalBuilds}`);
    lines.push(`Failures: ${stats.failureCount}, Errors: ${stats.errorCount}`);

    if (stats.commonProblems.length > 0) {
      lines.push('Most common problems:');
      for (const problem of stats.commonProblems.slice(0, 3)) {
        lines.push(`  - ${this.formatProblemType(problem.problemType)} (${problem.count}x)`);
      }
    }

    return lines.join('\n');
  }

  private formatProblemType(type: string): string {
    // Convert SCREAMING_SNAKE_CASE to Title Case
    return type
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  private emptyStats(): OverallStats {
    return {
      period: { from: new Date(), to: new Date() },
      totalBuilds: 0,
      successCount: 0,
      failureCount: 0,
      errorCount: 0,
      overallSuccessRate: 0,
      avgDuration: 0,
      buildTypeStats: [],
      topFailingBuildTypes: [],
      topCommonProblems: [],
      topFlakyTests: [],
    };
  }
}
