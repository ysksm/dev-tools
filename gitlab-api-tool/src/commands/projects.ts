/**
 * Projects Command
 */

import type { Command } from "commander";
import { createClientFromEnv } from "../client/index.js";
import type { ProjectListOptions, GitLabProject } from "../types/index.js";

interface ProjectsCommandOptions {
  owned?: boolean;
  membership?: boolean;
  starred?: boolean;
  search?: string;
  visibility?: "private" | "internal" | "public";
  archived?: boolean;
  orderBy?: string;
  sort?: "asc" | "desc";
  perPage?: string;
  page?: string;
  json?: boolean;
}

function formatProject(project: GitLabProject): string {
  const lines = [
    `ID: ${project.id}`,
    `Name: ${project.name_with_namespace}`,
    `Path: ${project.path_with_namespace}`,
    `URL: ${project.web_url}`,
    `Visibility: ${project.visibility}`,
    `Default Branch: ${project.default_branch}`,
    `Description: ${project.description ?? "(no description)"}`,
    `Stars: ${project.star_count} | Forks: ${project.forks_count} | Issues: ${project.open_issues_count}`,
    `Last Activity: ${project.last_activity_at}`,
    `Archived: ${project.archived ? "Yes" : "No"}`,
  ];
  return lines.join("\n");
}

export function registerProjectsCommand(program: Command): void {
  program
    .command("projects")
    .description("List GitLab projects")
    .option("--owned", "List only projects owned by the authenticated user")
    .option("--membership", "List only projects the user is a member of")
    .option("--starred", "List only starred projects")
    .option("-s, --search <query>", "Search projects by name")
    .option(
      "-v, --visibility <visibility>",
      "Filter by visibility (private, internal, public)"
    )
    .option("--archived", "Include archived projects")
    .option(
      "--order-by <field>",
      "Order by field (id, name, path, created_at, updated_at, last_activity_at)"
    )
    .option("--sort <direction>", "Sort direction (asc, desc)")
    .option("--per-page <count>", "Number of results per page", "20")
    .option("--page <number>", "Page number", "1")
    .option("--json", "Output as JSON")
    .action(async (options: ProjectsCommandOptions) => {
      try {
        const client = createClientFromEnv();

        const listOptions: ProjectListOptions = {
          owned: options.owned,
          membership: options.membership,
          starred: options.starred,
          search: options.search,
          visibility: options.visibility,
          archived: options.archived,
          orderBy: options.orderBy as ProjectListOptions["orderBy"],
          sort: options.sort,
          perPage: options.perPage ? parseInt(options.perPage, 10) : undefined,
          page: options.page ? parseInt(options.page, 10) : undefined,
        };

        const projects = await client.listProjects(listOptions);

        if (options.json) {
          console.log(JSON.stringify(projects, null, 2));
        } else {
          if (projects.length === 0) {
            console.log("No projects found.");
            return;
          }

          console.log(`Found ${projects.length} project(s):\n`);
          projects.forEach((project, index) => {
            console.log(`--- Project ${index + 1} ---`);
            console.log(formatProject(project));
            console.log("");
          });
        }
      } catch (error) {
        console.error(
          "Error:",
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
