import { Command } from 'commander';
import { glob } from 'glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TscParser } from '../../core/parser/tsc/TscParser.ts';
import { MermaidGenerator, type MermaidOptions } from '../../core/generator/MermaidGenerator.ts';

interface GenerateOptions {
  output?: string;
  noProperties?: boolean;
  noComments?: boolean;
  noKeys?: boolean;
}

export const generateCommand = new Command('generate')
  .alias('g')
  .description('Generate Mermaid ER diagram from TypeScript files')
  .argument('<patterns...>', 'Glob patterns for TypeScript files')
  .option('-o, --output <file>', 'Output file path (default: stdout)')
  .option('--no-properties', 'Hide entity properties')
  .option('--no-keys', 'Hide key type markers (PK, FK, UK)')
  .option('--comments', 'Show JSDoc comments')
  .action(async (patterns: string[], options: GenerateOptions & { comments?: boolean }) => {
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

      // Generate Mermaid
      const mermaidOptions: MermaidOptions = {
        showProperties: options.noProperties !== true,
        showComments: options.comments === true,
        showKeyTypes: options.noKeys !== true,
      };

      const generator = new MermaidGenerator(mermaidOptions);
      const mermaid = generator.generate(diagram);

      // Output
      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, mermaid, 'utf-8');
        console.error(`Generated: ${outputPath}`);
      } else {
        console.log(mermaid);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
