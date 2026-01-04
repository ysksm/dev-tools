/**
 * Init command - Initialize configuration file
 */

import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createDefaultConfigFile } from '../../config/config.js';
import { printSuccess, printError, printInfo } from '../utils/output.js';

interface InitOptions {
  force?: boolean;
}

export const initCommand = new Command('init')
  .description('Initialize a configuration file')
  .argument('[path]', 'Path for the config file', './tc-collect.config.json')
  .option('-f, --force', 'Overwrite existing file')
  .action(async (configPath: string, options: InitOptions) => {
    try {
      const absolutePath = path.resolve(configPath);

      // Check if file exists
      try {
        await fs.access(absolutePath);
        if (!options.force) {
          printError(`File already exists: ${absolutePath}`);
          printInfo('Use --force to overwrite');
          process.exit(1);
        }
      } catch {
        // File doesn't exist, continue
      }

      // Create config file
      const content = createDefaultConfigFile();
      await fs.writeFile(absolutePath, content, 'utf-8');

      printSuccess(`Configuration file created: ${absolutePath}`);
      console.log('');
      console.log('Edit the file to set your TeamCity server URL and authentication.');
      console.log('');
      console.log('You can also use environment variables:');
      console.log('  TEAMCITY_URL     - TeamCity server URL');
      console.log('  TEAMCITY_TOKEN   - Authentication token');
      console.log('  TEAMCITY_USERNAME - Username (alternative to token)');
      console.log('  TEAMCITY_PASSWORD - Password (required with username)');
      console.log('');
      console.log('Example usage:');
      console.log(`  tc-collect collect --config ${configPath}`);
    } catch (error) {
      printError(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
