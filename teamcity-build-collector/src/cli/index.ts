#!/usr/bin/env node

/**
 * TeamCity Build Collector CLI
 */

import { Command } from 'commander';
import { collectCommand } from './commands/collect.js';
import { analyzeCommand } from './commands/analyze.js';
import { listCommand } from './commands/list.js';
import { initCommand } from './commands/init.js';

const program = new Command();

program
  .name('tc-collect')
  .description('TeamCity build data collector for operational analysis')
  .version('1.0.0');

program.addCommand(collectCommand);
program.addCommand(analyzeCommand);
program.addCommand(listCommand);
program.addCommand(initCommand);

program.parse();
