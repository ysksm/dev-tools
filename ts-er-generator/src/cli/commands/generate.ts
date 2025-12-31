import { Command } from 'commander';
import { glob } from 'glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TscParser } from '../../core/parser/tsc/TscParser.ts';
import { MermaidGenerator, type MermaidOptions } from '../../core/generator/MermaidGenerator.ts';
import { D2Generator, type D2Options } from '../../core/generator/D2Generator.ts';
import { DrawioGenerator, type DrawioOptions } from '../../core/generator/DrawioGenerator.ts';

type OutputFormat = 'mermaid' | 'd2' | 'drawio';

interface GenerateOptions {
  output?: string;
  format?: OutputFormat;
  noProperties?: boolean;
  noComments?: boolean;
  noKeys?: boolean;
  direction?: 'd2';
}

export const generateCommand = new Command('generate')
  .alias('g')
  .description('Generate ER diagram from TypeScript files')
  .argument('<patterns...>', 'Glob patterns for TypeScript files')
  .option('-o, --output <file>', 'Output file path (default: stdout)')
  .option('-f, --format <format>', 'Output format: mermaid, d2, drawio (default: mermaid)', 'mermaid')
  .option('--no-properties', 'Hide entity properties')
  .option('--no-keys', 'Hide key type markers (PK, FK, UK)')
  .option('--comments', 'Show JSDoc comments')
  .option('--direction <dir>', 'D2 direction: right, down, left, up (default: right)')
  .action(async (patterns: string[], options: GenerateOptions & { comments?: boolean; direction?: string }) => {
    try {
      // Find matching files
      const files: string[] = [];
      for (const pattern of patterns) {
        const matches = await glob(pattern, {
          ignore: ['**/node_modules/**', '**/dist/**'],
          absolute: true,
        });
        files.push(...matches);
      }

      if (files.length === 0) {
        console.error('Error: No files found matching the patterns');
        process.exit(1);
      }

      console.error(`Found ${files.length} file(s)`);

      // Parse files
      const parser = new TscParser();
      const diagram = await parser.parseFiles(files);

      console.error(`Extracted ${diagram.entities.length} entities, ${diagram.relationships.length} relationships`);

      // Generate output based on format
      const format = (options.format || 'mermaid') as OutputFormat;
      let output: string;

      if (format === 'd2') {
        const d2Options: D2Options = {
          showProperties: options.noProperties !== true,
          showConstraints: options.noKeys !== true,
          direction: (options.direction as D2Options['direction']) || 'right',
        };
        const generator = new D2Generator(d2Options);
        output = generator.generate(diagram);
      } else if (format === 'drawio') {
        const drawioOptions: DrawioOptions = {
          showKeyTypes: options.noKeys !== true,
        };
        const generator = new DrawioGenerator(drawioOptions);
        output = generator.generate(diagram);
      } else {
        const mermaidOptions: MermaidOptions = {
          showProperties: options.noProperties !== true,
          showComments: options.comments === true,
          showKeyTypes: options.noKeys !== true,
        };
        const generator = new MermaidGenerator(mermaidOptions);
        output = generator.generate(diagram);
      }

      // Output
      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, output, 'utf-8');
        console.error(`Generated: ${outputPath}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
