#!/usr/bin/env node

/**
 * GitLab API Tool CLI
 */

import { Command } from "commander";
import { registerProjectsCommand, registerMergeRequestsCommand } from "./commands/index.js";

const program = new Command();

program
  .name("gitlab-tool")
  .description("CLI tool to interact with GitLab API")
  .version("1.0.0");

// Register commands
registerProjectsCommand(program);
registerMergeRequestsCommand(program);

// Add help text about environment variables
program.addHelpText(
  "after",
  `
Environment Variables:
  GITLAB_URL     GitLab instance URL (e.g., https://gitlab.com)
  GITLAB_TOKEN   GitLab personal access token

Examples:
  $ gitlab-tool projects --owned
  $ gitlab-tool projects --search "my-project"
  $ gitlab-tool merge-requests --state opened
  $ gitlab-tool mrs -p my-group/my-project --state all
  $ gitlab-tool mrs --scope assigned_to_me
`
);

program.parse();
