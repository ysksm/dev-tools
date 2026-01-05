/**
 * Merge Requests Command
 */

import type { Command } from "commander";
import { createClientFromEnv } from "../client/index.js";
import type { MergeRequestListOptions, GitLabMergeRequest } from "../types/index.js";

interface MergeRequestsCommandOptions {
  project?: string;
  state?: "opened" | "closed" | "merged" | "locked" | "all";
  scope?: "created_by_me" | "assigned_to_me" | "all";
  authorId?: string;
  assigneeId?: string;
  reviewerId?: string;
  search?: string;
  labels?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  orderBy?: string;
  sort?: "asc" | "desc";
  perPage?: string;
  page?: string;
  json?: boolean;
}

function formatMergeRequest(mr: GitLabMergeRequest): string {
  const stateEmoji = {
    opened: "🟢",
    closed: "🔴",
    merged: "🟣",
    locked: "🔒",
  }[mr.state];

  const lines = [
    `ID: ${mr.id} | IID: !${mr.iid}`,
    `Title: ${mr.draft ? "[Draft] " : ""}${mr.title}`,
    `State: ${stateEmoji} ${mr.state}`,
    `Branch: ${mr.source_branch} → ${mr.target_branch}`,
    `URL: ${mr.web_url}`,
    `Author: ${mr.author.name} (@${mr.author.username})`,
    `Assignee: ${mr.assignee ? `${mr.assignee.name} (@${mr.assignee.username})` : "(none)"}`,
    `Reviewers: ${mr.reviewers.length > 0 ? mr.reviewers.map((r) => `@${r.username}`).join(", ") : "(none)"}`,
    `Labels: ${mr.labels.length > 0 ? mr.labels.join(", ") : "(none)"}`,
    `Has Conflicts: ${mr.has_conflicts ? "Yes ⚠️" : "No"}`,
    `Created: ${mr.created_at}`,
    `Updated: ${mr.updated_at}`,
  ];

  if (mr.merged_at) {
    lines.push(`Merged: ${mr.merged_at}`);
  }
  if (mr.closed_at) {
    lines.push(`Closed: ${mr.closed_at}`);
  }

  return lines.join("\n");
}

export function registerMergeRequestsCommand(program: Command): void {
  program
    .command("merge-requests")
    .alias("mrs")
    .description("List GitLab merge requests")
    .option("-p, --project <id>", "Project ID or path (e.g., 'group/project')")
    .option(
      "--state <state>",
      "Filter by state (opened, closed, merged, locked, all)",
      "opened"
    )
    .option(
      "--scope <scope>",
      "Filter by scope (created_by_me, assigned_to_me, all)"
    )
    .option("--author-id <id>", "Filter by author ID")
    .option("--assignee-id <id>", "Filter by assignee ID")
    .option("--reviewer-id <id>", "Filter by reviewer ID")
    .option("-s, --search <query>", "Search in title and description")
    .option("-l, --labels <labels>", "Filter by labels (comma-separated)")
    .option("--created-after <date>", "Filter by created date (ISO 8601)")
    .option("--created-before <date>", "Filter by created date (ISO 8601)")
    .option("--updated-after <date>", "Filter by updated date (ISO 8601)")
    .option("--updated-before <date>", "Filter by updated date (ISO 8601)")
    .option("--order-by <field>", "Order by field (created_at, updated_at)")
    .option("--sort <direction>", "Sort direction (asc, desc)")
    .option("--per-page <count>", "Number of results per page", "20")
    .option("--page <number>", "Page number", "1")
    .option("--json", "Output as JSON")
    .action(async (options: MergeRequestsCommandOptions) => {
      try {
        const client = createClientFromEnv();

        const listOptions: MergeRequestListOptions = {
          projectId: options.project,
          state: options.state,
          scope: options.scope,
          authorId: options.authorId ? parseInt(options.authorId, 10) : undefined,
          assigneeId: options.assigneeId
            ? parseInt(options.assigneeId, 10)
            : undefined,
          reviewerId: options.reviewerId
            ? parseInt(options.reviewerId, 10)
            : undefined,
          search: options.search,
          labels: options.labels ? options.labels.split(",").map((l) => l.trim()) : undefined,
          createdAfter: options.createdAfter,
          createdBefore: options.createdBefore,
          updatedAfter: options.updatedAfter,
          updatedBefore: options.updatedBefore,
          orderBy: options.orderBy as MergeRequestListOptions["orderBy"],
          sort: options.sort,
          perPage: options.perPage ? parseInt(options.perPage, 10) : undefined,
          page: options.page ? parseInt(options.page, 10) : undefined,
        };

        const mergeRequests = await client.listMergeRequests(listOptions);

        if (options.json) {
          console.log(JSON.stringify(mergeRequests, null, 2));
        } else {
          if (mergeRequests.length === 0) {
            console.log("No merge requests found.");
            return;
          }

          const projectInfo = options.project
            ? ` for project: ${options.project}`
            : "";
          console.log(
            `Found ${mergeRequests.length} merge request(s)${projectInfo}:\n`
          );

          mergeRequests.forEach((mr, index) => {
            console.log(`--- MR ${index + 1} ---`);
            console.log(formatMergeRequest(mr));
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
