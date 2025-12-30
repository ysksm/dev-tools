import type { ERDiagram } from '../../models/index.ts';

/**
 * Common interface for TypeScript parsers
 */
export interface ITypeScriptParser {
  /**
   * Parse TypeScript files from file paths
   * @param filePaths - Array of file paths to parse
   * @returns Parsed ER diagram
   */
  parseFiles(filePaths: string[]): Promise<ERDiagram>;

  /**
   * Parse TypeScript source code directly
   * @param source - TypeScript source code
   * @param fileName - Virtual file name (optional)
   * @returns Parsed ER diagram
   */
  parseSource(source: string, fileName?: string): Promise<ERDiagram>;
}

/**
 * Parser configuration
 */
export interface ParserConfig {
  /** Parser engine to use */
  engine: 'tsc';
}

/**
 * Factory function to create a parser instance
 * @param config - Parser configuration
 * @returns Parser instance
 */
export async function createParser(config: ParserConfig = { engine: 'tsc' }): Promise<ITypeScriptParser> {
  switch (config.engine) {
    case 'tsc': {
      const { TscParser } = await import('./tsc/TscParser.ts');
      return new TscParser();
    }
    default:
      throw new Error(`Unknown parser engine: ${config.engine}`);
  }
}

export { TscParser } from './tsc/TscParser.ts';
