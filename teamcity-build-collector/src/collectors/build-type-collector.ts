/**
 * Build Type (Build Definition) Collector
 */

import { TeamCityClient } from '../api/client.js';
import type { BuildType, Project } from '../models/teamcity.js';

export interface BuildTypeInfo {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  projectName: string;
  projectPath: string;
  webUrl: string;
  paused: boolean;
}

export interface CollectBuildTypesOptions {
  projectId?: string;
  includeArchived?: boolean;
}

export class BuildTypeCollector {
  constructor(private readonly client: TeamCityClient) {}

  async collect(options: CollectBuildTypesOptions = {}): Promise<BuildTypeInfo[]> {
    const buildTypes = await this.client.getBuildTypes(options.projectId);
    const projects = await this.getProjectMap();

    return buildTypes.map((bt) => this.toBuildTypeInfo(bt, projects));
  }

  async collectByProject(): Promise<Map<string, BuildTypeInfo[]>> {
    const buildTypes = await this.collect();
    const byProject = new Map<string, BuildTypeInfo[]>();

    for (const bt of buildTypes) {
      const list = byProject.get(bt.projectId) ?? [];
      list.push(bt);
      byProject.set(bt.projectId, list);
    }

    return byProject;
  }

  async getBuildType(buildTypeId: string): Promise<BuildTypeInfo | null> {
    try {
      const bt = await this.client.getBuildType(buildTypeId);
      const projects = await this.getProjectMap();
      return this.toBuildTypeInfo(bt, projects);
    } catch {
      return null;
    }
  }

  private async getProjectMap(): Promise<Map<string, Project>> {
    const projects = await this.client.getProjects();
    const map = new Map<string, Project>();
    for (const project of projects) {
      map.set(project.id, project);
    }
    return map;
  }

  private toBuildTypeInfo(
    bt: BuildType,
    projects: Map<string, Project>
  ): BuildTypeInfo {
    return {
      id: bt.id,
      name: bt.name,
      description: bt.description,
      projectId: bt.projectId,
      projectName: bt.projectName,
      projectPath: this.getProjectPath(bt.projectId, projects),
      webUrl: bt.webUrl,
      paused: bt.paused ?? false,
    };
  }

  private getProjectPath(
    projectId: string,
    projects: Map<string, Project>
  ): string {
    const pathParts: string[] = [];
    let currentId: string | undefined = projectId;

    while (currentId) {
      const project = projects.get(currentId);
      if (!project) break;
      pathParts.unshift(project.name);
      currentId = project.parentProjectId;
    }

    return pathParts.join(' / ');
  }
}
