/**
 * TeamCity API response models
 */

// Build Type (ビルド定義)
export interface BuildType {
  id: string;
  name: string;
  description?: string;
  projectName: string;
  projectId: string;
  href: string;
  webUrl: string;
  paused?: boolean;
}

export interface BuildTypesResponse {
  count: number;
  href: string;
  buildType: BuildType[];
}

// Build (ビルド結果)
export interface Build {
  id: number;
  buildTypeId: string;
  number: string;
  status: BuildStatus;
  state: BuildState;
  href: string;
  webUrl: string;
  statusText?: string;
  branchName?: string;
  defaultBranch?: boolean;
  startDate?: string;
  finishDate?: string;
  queuedDate?: string;
  agent?: Agent;
  triggered?: Triggered;
  lastChanges?: LastChanges;
  revisions?: Revisions;
  problemOccurrences?: ProblemOccurrencesRef;
  testOccurrences?: TestOccurrencesRef;
  buildType?: BuildType;
  comment?: Comment;
  properties?: Properties;
  statistics?: Statistics;
}

export type BuildStatus = 'SUCCESS' | 'FAILURE' | 'ERROR' | 'UNKNOWN';
export type BuildState = 'queued' | 'running' | 'finished';

export interface BuildsResponse {
  count: number;
  href: string;
  nextHref?: string;
  prevHref?: string;
  build: Build[];
}

// Agent
export interface Agent {
  id: number;
  name: string;
  typeId: number;
  href: string;
}

// Triggered
export interface Triggered {
  type: string;
  date: string;
  user?: User;
}

export interface User {
  username: string;
  name?: string;
  id: number;
  href: string;
}

// Changes
export interface LastChanges {
  count: number;
  change: Change[];
}

export interface Change {
  id: number;
  version: string;
  username: string;
  date: string;
  href: string;
  comment?: string;
}

// Revisions
export interface Revisions {
  count: number;
  revision: Revision[];
}

export interface Revision {
  version: string;
  vcsBranchName?: string;
  'vcs-root-instance'?: VcsRootInstance;
}

export interface VcsRootInstance {
  id: string;
  name: string;
  href: string;
}

// Problem Occurrences (ビルド問題)
export interface ProblemOccurrencesRef {
  count: number;
  href: string;
  passed?: number;
  failed?: number;
  newFailed?: number;
  ignored?: number;
  muted?: number;
}

export interface ProblemOccurrencesResponse {
  count: number;
  href: string;
  problemOccurrence: ProblemOccurrence[];
}

export interface ProblemOccurrence {
  id: string;
  type: string;
  identity: string;
  href: string;
  details?: string;
  additionalData?: string;
  problem?: Problem;
  build?: BuildRef;
  muted?: boolean;
  currentlyMuted?: boolean;
  currentlyInvestigated?: boolean;
  newFailure?: boolean;
}

export interface Problem {
  id: string;
  type: string;
  identity: string;
  href: string;
}

export interface BuildRef {
  id: number;
  buildTypeId: string;
  href: string;
}

// Test Occurrences (テスト結果)
export interface TestOccurrencesRef {
  count: number;
  href: string;
  passed?: number;
  failed?: number;
  newFailed?: number;
  ignored?: number;
  muted?: number;
}

export interface TestOccurrencesResponse {
  count: number;
  href: string;
  nextHref?: string;
  testOccurrence: TestOccurrence[];
}

export interface TestOccurrence {
  id: string;
  name: string;
  status: TestStatus;
  duration?: number;
  href: string;
  details?: string;
  currentlyMuted?: boolean;
  currentlyInvestigated?: boolean;
  muted?: boolean;
  newFailure?: boolean;
  ignored?: boolean;
  test?: Test;
  build?: BuildRef;
}

export type TestStatus = 'SUCCESS' | 'FAILURE' | 'UNKNOWN';

export interface Test {
  id: string;
  name: string;
  href: string;
}

// Comment
export interface Comment {
  timestamp: string;
  text: string;
  user?: User;
}

// Properties
export interface Properties {
  count: number;
  property: Property[];
}

export interface Property {
  name: string;
  value: string;
}

// Statistics
export interface Statistics {
  count: number;
  href: string;
  property?: StatisticProperty[];
}

export interface StatisticProperty {
  name: string;
  value: string;
}

// Project
export interface Project {
  id: string;
  name: string;
  description?: string;
  parentProjectId?: string;
  href: string;
  webUrl: string;
  archived?: boolean;
  buildTypes?: { buildType: BuildType[] };
}

export interface ProjectsResponse {
  count: number;
  href: string;
  project: Project[];
}
