/**
 * Collect command - Collects build data from TeamCity
 */

import { Command } from 'commander';
import { subDays } from 'date-fns';
import { TeamCityClient } from '../../api/client.js';
import { BuildCollector } from '../../collectors/build-collector.js';
import { BuildAnalyzer } from '../../analyzers/build-analyzer.js';
import { ReportGenerator } from '../../reports/report-generator.js';
import { ConfigManager, type AppConfig } from '../../config/config.js';
import type { CollectorOptions, ExportFormat } from '../../models/analysis.js';
import { createSpinner, printSuccess, printError, printInfo } from '../utils/output.js';

interface CollectOptions {
  config?: string;
  url?: string;
  token?: string;
  username?: string;
  password?: string;
  project?: string;
  buildType?: string[];
  days?: string;
  count?: string;
  branch?: string;
  format?: string;
  output?: string;
  includeRunning?: boolean;
  raw?: boolean;
}

export const collectCommand = new Command('collect')
  .description('Collect build data and generate analysis report')
  .option('-c, --config <path>', 'Path to config file')
  .option('-u, --url <url>', 'TeamCity server URL')
  .option('-t, --token <token>', 'TeamCity auth token')
  .option('--username <username>', 'TeamCity username')
  .option('--password <password>', 'TeamCity password')
  .option('-p, --project <id>', 'Project ID to filter builds')
  .option('-b, --build-type <ids...>', 'Build type IDs to filter')
  .option('-d, --days <number>', 'Number of days to look back', '7')
  .option('-n, --count <number>', 'Maximum number of builds to collect', '500')
  .option('--branch <name>', 'Filter by branch name')
  .option('-f, --format <format>', 'Output format (json|csv|markdown|html)', 'markdown')
  .option('-o, --output <path>', 'Output directory', './reports')
  .option('--include-running', 'Include running builds')
  .option('--raw', 'Export raw build data without analysis')
  .action(async (options: CollectOptions) => {
    try {
      // Load configuration
      const configManager = new ConfigManager();
      await configManager.load(options.config);

      // Override with command line options
      const config = applyOptions(configManager.get(), options);

      // Validate configuration
      const errors = validateConfig(config, options);
      if (errors.length > 0) {
        for (const error of errors) {
          printError(error);
        }
        process.exit(1);
      }

      // Create client
      const client = new TeamCityClient({
        serverUrl: config.teamcity.serverUrl,
        authToken: config.teamcity.authToken,
        username: config.teamcity.username,
        password: config.teamcity.password,
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

      // Calculate date range
      const daysBack = parseInt(options.days ?? '7', 10);
      const toDate = new Date();
      const fromDate = subDays(toDate, daysBack);

      // Collect builds
      const collectSpinner = createSpinner('Collecting builds...');
      collectSpinner.start();

      const collector = new BuildCollector(client);
      const collectorOptions: CollectorOptions = {
        serverUrl: config.teamcity.serverUrl,
        projectId: config.collection.projectId,
        buildTypeIds: config.collection.buildTypeIds,
        fromDate,
        toDate,
        count: parseInt(options.count ?? '500', 10),
        branch: options.branch,
        includeRunning: options.includeRunning ?? false,
      };

      const builds = await collector.collect(collectorOptions, (progress) => {
        collectSpinner.text = `Collecting builds... ${progress.current}/${progress.total}`;
      });

      collectSpinner.succeed(`Collected ${builds.length} builds`);

      if (builds.length === 0) {
        printInfo('No builds found matching the criteria');
        return;
      }

      // Generate report
      const reportGenerator = new ReportGenerator();
      const format = (options.format ?? 'markdown') as ExportFormat;
      const outputDir = options.output ?? './reports';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      if (options.raw) {
        // Export raw build data
        const outputPath = `${outputDir}/builds-${timestamp}.${format === 'markdown' ? 'json' : format}`;
        await reportGenerator.exportBuilds(builds, {
          format: format === 'markdown' ? 'json' : format,
          outputPath,
        });
        printSuccess(`Raw build data exported to: ${outputPath}`);
      } else {
        // Analyze and generate report
        const analyzeSpinner = createSpinner('Analyzing builds...');
        analyzeSpinner.start();

        const analyzer = new BuildAnalyzer();
        const stats = analyzer.analyze(builds);
        const recommendations = analyzer.generateRecommendations(stats);
        const report = await reportGenerator.generateReport(stats, recommendations);

        analyzeSpinner.succeed('Analysis complete');

        // Export report
        const ext = format === 'markdown' ? 'md' : format;
        const outputPath = `${outputDir}/report-${timestamp}.${ext}`;
        await reportGenerator.export(report, {
          format,
          outputPath,
          includeDetails: config.output.includeDetails,
        });

        printSuccess(`Report generated: ${outputPath}`);

        // Print summary
        printSummary(stats);
      }
    } catch (error) {
      printError(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

function applyOptions(config: AppConfig, options: CollectOptions): AppConfig {
  const updated = { ...config };

  if (options.url) {
    updated.teamcity.serverUrl = options.url;
  }
  if (options.token) {
    updated.teamcity.authToken = options.token;
  }
  if (options.username) {
    updated.teamcity.username = options.username;
  }
  if (options.password) {
    updated.teamcity.password = options.password;
  }
  if (options.project) {
    updated.collection.projectId = options.project;
  }
  if (options.buildType && options.buildType.length > 0) {
    updated.collection.buildTypeIds = options.buildType;
  }
  if (options.format) {
    updated.output.format = options.format as AppConfig['output']['format'];
  }
  if (options.output) {
    updated.output.outputDir = options.output;
  }

  return updated;
}

function validateConfig(config: AppConfig, options: CollectOptions): string[] {
  const errors: string[] = [];

  if (!config.teamcity.serverUrl) {
    errors.push('TeamCity server URL is required. Use --url or set TEAMCITY_URL environment variable.');
  }

  if (!config.teamcity.authToken && !config.teamcity.username) {
    errors.push(
      'Authentication is required. Use --token or --username/--password, or set TEAMCITY_TOKEN environment variable.'
    );
  }

  return errors;
}

function printSummary(stats: import('../../models/analysis.js').OverallStats): void {
  console.log('');
  console.log('=== Summary ===');
  console.log(`Total builds: ${stats.totalBuilds}`);
  console.log(`Success rate: ${(stats.overallSuccessRate * 100).toFixed(1)}%`);
  console.log(`Success: ${stats.successCount} | Failure: ${stats.failureCount} | Error: ${stats.errorCount}`);

  if (stats.topFailingBuildTypes.length > 0) {
    console.log('');
    console.log('Top failing build types:');
    for (const bt of stats.topFailingBuildTypes.slice(0, 3)) {
      console.log(`  - ${bt.buildTypeName}: ${(bt.successRate * 100).toFixed(1)}% success rate`);
    }
  }

  if (stats.topCommonProblems.length > 0) {
    console.log('');
    console.log('Most common problems:');
    for (const p of stats.topCommonProblems.slice(0, 3)) {
      console.log(`  - ${p.problemType}: ${p.count} occurrences`);
    }
  }
}
