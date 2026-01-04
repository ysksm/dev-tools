/**
 * Analyze command - Analyzes previously collected build data
 */

import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import { BuildAnalyzer } from '../../analyzers/build-analyzer.js';
import { ReportGenerator } from '../../reports/report-generator.js';
import type { CollectedBuild, ExportFormat } from '../../models/analysis.js';
import { createSpinner, printSuccess, printError, printInfo } from '../utils/output.js';

interface AnalyzeOptions {
  format?: string;
  output?: string;
  flakyThreshold?: string;
  failureThreshold?: string;
}

export const analyzeCommand = new Command('analyze')
  .description('Analyze previously collected build data from a JSON file')
  .argument('<file>', 'Path to JSON file containing collected build data')
  .option('-f, --format <format>', 'Output format (json|csv|markdown|html)', 'markdown')
  .option('-o, --output <path>', 'Output directory', './reports')
  .option('--flaky-threshold <percent>', 'Flaky test threshold (0-100)', '20')
  .option('--failure-threshold <percent>', 'High failure rate threshold (0-100)', '30')
  .action(async (file: string, options: AnalyzeOptions) => {
    try {
      // Load build data
      const spinner = createSpinner('Loading build data...');
      spinner.start();

      const content = await fs.readFile(file, 'utf-8');
      const rawData = JSON.parse(content);

      // Parse dates in build data
      const builds: CollectedBuild[] = parseBuilds(rawData);

      spinner.succeed(`Loaded ${builds.length} builds`);

      if (builds.length === 0) {
        printInfo('No builds found in the file');
        return;
      }

      // Analyze builds
      const analyzeSpinner = createSpinner('Analyzing builds...');
      analyzeSpinner.start();

      const flakyThreshold = parseFloat(options.flakyThreshold ?? '20') / 100;
      const failureThreshold = parseFloat(options.failureThreshold ?? '30') / 100;

      const analyzer = new BuildAnalyzer({
        flakyTestThreshold: flakyThreshold,
        highFailureRateThreshold: failureThreshold,
      });

      const stats = analyzer.analyze(builds);
      const recommendations = analyzer.generateRecommendations(stats);

      analyzeSpinner.succeed('Analysis complete');

      // Generate report
      const reportGenerator = new ReportGenerator();
      const report = await reportGenerator.generateReport(stats, recommendations);

      const format = (options.format ?? 'markdown') as ExportFormat;
      const outputDir = options.output ?? './reports';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const ext = format === 'markdown' ? 'md' : format;
      const outputPath = `${outputDir}/analysis-${timestamp}.${ext}`;

      await reportGenerator.export(report, {
        format,
        outputPath,
        includeDetails: true,
      });

      printSuccess(`Analysis report generated: ${outputPath}`);

      // Print summary
      printSummary(stats, recommendations);
    } catch (error) {
      printError(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

function parseBuilds(data: unknown): CollectedBuild[] {
  if (!Array.isArray(data)) {
    throw new Error('Invalid data format: expected an array of builds');
  }

  return data.map((build) => ({
    ...build,
    startDate: new Date(build.startDate),
    finishDate: new Date(build.finishDate),
  }));
}

function printSummary(
  stats: import('../../models/analysis.js').OverallStats,
  recommendations: import('../../models/analysis.js').Recommendation[]
): void {
  console.log('');
  console.log('=== Analysis Summary ===');
  console.log(`Total builds analyzed: ${stats.totalBuilds}`);
  console.log(`Overall success rate: ${(stats.overallSuccessRate * 100).toFixed(1)}%`);
  console.log(`Build types analyzed: ${stats.buildTypeStats.length}`);

  if (recommendations.length > 0) {
    console.log('');
    console.log('Key recommendations:');
    const highPriority = recommendations.filter((r) => r.priority === 'HIGH');
    for (const rec of highPriority.slice(0, 5)) {
      console.log(`  [HIGH] ${rec.message}`);
    }
  }
}
