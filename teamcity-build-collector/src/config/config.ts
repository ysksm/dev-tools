/**
 * Configuration management
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

export interface TeamCityConfig {
  serverUrl: string;
  authToken?: string;
  username?: string;
  password?: string;
}

export interface CollectionConfig {
  projectId?: string;
  buildTypeIds?: string[];
  daysBack?: number;
  maxBuilds?: number;
  branch?: string;
  includeRunning?: boolean;
  includeCanceled?: boolean;
}

export interface OutputConfig {
  format: 'json' | 'csv' | 'markdown' | 'html';
  outputDir: string;
  includeDetails?: boolean;
}

export interface AppConfig {
  teamcity: TeamCityConfig;
  collection: CollectionConfig;
  output: OutputConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  teamcity: {
    serverUrl: '',
  },
  collection: {
    daysBack: 7,
    maxBuilds: 500,
    includeRunning: false,
    includeCanceled: false,
  },
  output: {
    format: 'markdown',
    outputDir: './reports',
    includeDetails: true,
  },
};

export class ConfigManager {
  private config: AppConfig;
  private configPath?: string;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  async load(configPath?: string): Promise<AppConfig> {
    // Load .env file first
    dotenv.config();

    // Load from environment variables
    this.loadFromEnv();

    // Load from config file if specified
    if (configPath) {
      await this.loadFromFile(configPath);
    }

    return this.config;
  }

  private loadFromEnv(): void {
    const env = process.env;

    if (env.TEAMCITY_URL) {
      this.config.teamcity.serverUrl = env.TEAMCITY_URL;
    }
    if (env.TEAMCITY_TOKEN) {
      this.config.teamcity.authToken = env.TEAMCITY_TOKEN;
    }
    if (env.TEAMCITY_USERNAME) {
      this.config.teamcity.username = env.TEAMCITY_USERNAME;
    }
    if (env.TEAMCITY_PASSWORD) {
      this.config.teamcity.password = env.TEAMCITY_PASSWORD;
    }
    if (env.TEAMCITY_PROJECT_ID) {
      this.config.collection.projectId = env.TEAMCITY_PROJECT_ID;
    }
    if (env.TEAMCITY_BUILD_TYPE_IDS) {
      this.config.collection.buildTypeIds = env.TEAMCITY_BUILD_TYPE_IDS.split(',');
    }
    if (env.TEAMCITY_DAYS_BACK) {
      this.config.collection.daysBack = parseInt(env.TEAMCITY_DAYS_BACK, 10);
    }
    if (env.TEAMCITY_MAX_BUILDS) {
      this.config.collection.maxBuilds = parseInt(env.TEAMCITY_MAX_BUILDS, 10);
    }
    if (env.TEAMCITY_OUTPUT_FORMAT) {
      this.config.output.format = env.TEAMCITY_OUTPUT_FORMAT as AppConfig['output']['format'];
    }
    if (env.TEAMCITY_OUTPUT_DIR) {
      this.config.output.outputDir = env.TEAMCITY_OUTPUT_DIR;
    }
  }

  private async loadFromFile(filePath: string): Promise<void> {
    try {
      const absolutePath = path.resolve(filePath);
      const content = await fs.readFile(absolutePath, 'utf-8');
      const fileConfig = JSON.parse(content) as Partial<AppConfig>;

      // Merge with existing config
      if (fileConfig.teamcity) {
        this.config.teamcity = { ...this.config.teamcity, ...fileConfig.teamcity };
      }
      if (fileConfig.collection) {
        this.config.collection = { ...this.config.collection, ...fileConfig.collection };
      }
      if (fileConfig.output) {
        this.config.output = { ...this.config.output, ...fileConfig.output };
      }

      this.configPath = absolutePath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // Config file doesn't exist, use defaults
    }
  }

  async save(configPath?: string): Promise<void> {
    const savePath = configPath ?? this.configPath;
    if (!savePath) {
      throw new Error('No config path specified');
    }

    const content = JSON.stringify(this.config, null, 2);
    await fs.writeFile(savePath, content, 'utf-8');
  }

  get(): AppConfig {
    return this.config;
  }

  set(updates: Partial<AppConfig>): void {
    if (updates.teamcity) {
      this.config.teamcity = { ...this.config.teamcity, ...updates.teamcity };
    }
    if (updates.collection) {
      this.config.collection = { ...this.config.collection, ...updates.collection };
    }
    if (updates.output) {
      this.config.output = { ...this.config.output, ...updates.output };
    }
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.config.teamcity.serverUrl) {
      errors.push('TeamCity server URL is required');
    }

    if (!this.config.teamcity.authToken && !this.config.teamcity.username) {
      errors.push('Either auth token or username/password is required');
    }

    if (this.config.teamcity.username && !this.config.teamcity.password) {
      errors.push('Password is required when username is specified');
    }

    return errors;
  }
}

export function createDefaultConfigFile(): string {
  const template: AppConfig = {
    teamcity: {
      serverUrl: 'https://teamcity.example.com',
      authToken: 'your-auth-token-here',
    },
    collection: {
      projectId: 'YourProjectId',
      daysBack: 7,
      maxBuilds: 500,
    },
    output: {
      format: 'markdown',
      outputDir: './reports',
      includeDetails: true,
    },
  };

  return JSON.stringify(template, null, 2);
}
