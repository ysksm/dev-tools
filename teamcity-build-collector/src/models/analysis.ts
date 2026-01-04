/**
 * Analysis models for build data
 */

import type { BuildStatus, ProblemOccurrence, TestOccurrence } from './teamcity.js';

// Collected build data
export interface CollectedBuild {
  id: number;
  buildTypeId: string;
  buildTypeName: string;
  projectName: string;
  number: string;
  status: BuildStatus;
  statusText?: string;
  branchName?: string;
  startDate: Date;
  finishDate: Date;
  duration: number; // in milliseconds
  agentName?: string;
  triggeredBy?: string;
  triggerType?: string;
  webUrl: string;
  problems: CollectedProblem[];
  failedTests: CollectedTestFailure[];
}

export interface CollectedProblem {
  id: string;
  type: string;
  identity: string;
  details?: string;
  isNew: boolean;
}

export interface CollectedTestFailure {
  id: string;
  name: string;
  duration?: number;
  details?: string;
  isNew: boolean;
  isMuted: boolean;
}

// Build statistics
export interface BuildTypeStats {
  buildTypeId: string;
  buildTypeName: string;
  projectName: string;
  totalBuilds: number;
  successCount: number;
  failureCount: number;
  errorCount: number;
  successRate: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  recentFailures: FailureSummary[];
  commonProblems: ProblemFrequency[];
  flakyTests: FlakyTest[];
}

export interface FailureSummary {
  buildId: number;
  buildNumber: string;
  date: Date;
  statusText?: string;
  problems: string[];
  failedTestCount: number;
  webUrl: string;
}

export interface ProblemFrequency {
  problemType: string;
  identity: string;
  count: number;
  lastOccurrence: Date;
  details?: string;
}

export interface FlakyTest {
  testName: string;
  totalRuns: number;
  failureCount: number;
  failureRate: number;
  lastFailure?: Date;
}

// Overall statistics
export interface OverallStats {
  period: {
    from: Date;
    to: Date;
  };
  totalBuilds: number;
  successCount: number;
  failureCount: number;
  errorCount: number;
  overallSuccessRate: number;
  avgDuration: number;
  buildTypeStats: BuildTypeStats[];
  topFailingBuildTypes: BuildTypeStats[];
  topCommonProblems: ProblemFrequency[];
  topFlakyTests: FlakyTest[];
}

// Report output
export interface Report {
  generatedAt: Date;
  stats: OverallStats;
  recommendations: Recommendation[];
}

export interface Recommendation {
  type: RecommendationType;
  priority: Priority;
  buildTypeId?: string;
  buildTypeName?: string;
  message: string;
  details?: string;
}

export type RecommendationType =
  | 'HIGH_FAILURE_RATE'
  | 'FLAKY_TEST'
  | 'SLOW_BUILD'
  | 'COMMON_PROBLEM'
  | 'INFRASTRUCTURE_ISSUE'
  | 'UNSTABLE_BRANCH';

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

// Filter options
export interface CollectorOptions {
  serverUrl: string;
  authToken?: string;
  username?: string;
  password?: string;
  projectId?: string;
  buildTypeIds?: string[];
  fromDate?: Date;
  toDate?: Date;
  count?: number;
  branch?: string;
  includeRunning?: boolean;
  includeCanceled?: boolean;
}

export interface ExportOptions {
  format: ExportFormat;
  outputPath: string;
  includeDetails?: boolean;
}

export type ExportFormat = 'json' | 'csv' | 'markdown' | 'html';
