#!/usr/bin/env bun

import { Command } from 'commander';
import { generateCommand } from './commands/generate.ts';
import { previewCommand } from './commands/preview.ts';

const program = new Command();

program
  .name('ts-er')
  .description('Generate ER diagrams from TypeScript definitions')
  .version('0.1.0');

program.addCommand(generateCommand);
program.addCommand(previewCommand);

program.parse();
