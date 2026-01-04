/**
 * List command - Lists projects and build types from TeamCity
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { TeamCityClient } from '../../api/client.js';
import { BuildTypeCollector } from '../../collectors/build-type-collector.js';
import { ConfigManager } from '../../config/config.js';
import { createSpinner, printSuccess, printError, printInfo } from '../utils/output.js';

interface ListOptions {
  config?: string;
  url?: string;
  token?: string;
  username?: string;
  password?: string;
  project?: string;
  json?: boolean;
}

export const listCommand = new Command('list')
  .description('List projects and build types from TeamCity')
  .option('-c, --config <path>', 'Path to config file')
  .option('-u, --url <url>', 'TeamCity server URL')
  .option('-t, --token <token>', 'TeamCity auth token')
  .option('--username <username>', 'TeamCity username')
  .option('--password <password>', 'TeamCity password')
  .option('-p, --project <id>', 'Filter by project ID')
  .option('--json', 'Output as JSON')
  .action(async (options: ListOptions) => {
    try {
      // Load configuration
      const configManager = new ConfigManager();
      await configManager.load(options.config);
      const config = configManager.get();

      // Override with command line options
      const serverUrl = options.url ?? config.teamcity.serverUrl;
      const authToken = options.token ?? config.teamcity.authToken;
      const username = options.username ?? config.teamcity.username;
      const password = options.password ?? config.teamcity.password;

      if (!serverUrl) {
        printError('TeamCity server URL is required. Use --url or set TEAMCITY_URL environment variable.');
        process.exit(1);
      }

      if (!authToken && !username) {
        printError('Authentication is required. Use --token or --username/--password.');
        process.exit(1);
      }

      // Create client
      const client = new TeamCityClient({
        serverUrl,
        authToken,
        username,
        password,
      });

      // Check connection
      const spinner = createSpinner('Connecting to TeamCity...');
      spinner.start();

      const connected = await client.checkConnection();
      if (!connected) {
        spinner.fail('Failed to connect to TeamCity server');
        process.exit(1);
      }
      spinner.succeed('Connected to TeamCity');

      // Collect build types
      const listSpinner = createSpinner('Fetching build types...');
      listSpinner.start();

      const collector = new BuildTypeCollector(client);
      const buildTypes = await collector.collect({ projectId: options.project });

      listSpinner.succeed(`Found ${buildTypes.length} build types`);

      if (buildTypes.length === 0) {
        printInfo('No build types found');
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(buildTypes, null, 2));
      } else {
        // Group by project
        const byProject = new Map<string, typeof buildTypes>();
        for (const bt of buildTypes) {
          const list = byProject.get(bt.projectName) ?? [];
          list.push(bt);
          byProject.set(bt.projectName, list);
        }

        // Print table for each project
        for (const [projectName, projectBuildTypes] of byProject) {
          console.log('');
          console.log(`Project: ${projectName}`);

          const table = new Table({
            head: ['Build Type ID', 'Name', 'Paused'],
            colWidths: [40, 50, 8],
            style: { head: ['cyan'] },
          });

          for (const bt of projectBuildTypes) {
            table.push([bt.id, bt.name, bt.paused ? 'Yes' : 'No']);
          }

          console.log(table.toString());
        }
      }
    } catch (error) {
      printError(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
