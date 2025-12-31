import type {
  ERDiagram,
  Entity,
  Relationship,
  Property,
  PropertyType,
} from '../../models/index.ts';

/**
 * Options for D2 diagram generation
 */
export interface D2Options {
  /** Direction of the diagram (right, down, left, up) */
  direction?: 'right' | 'down' | 'left' | 'up';
  /** Shape for entities (sql_table, class) */
  shape?: 'sql_table' | 'class';
  /** Show entity properties */
  showProperties?: boolean;
  /** Show key type constraints */
  showConstraints?: boolean;
}

const DEFAULT_OPTIONS: Required<D2Options> = {
  direction: 'right',
  shape: 'sql_table',
  showProperties: true,
  showConstraints: true,
};

/**
 * Generator for D2 diagram format
 * @see https://d2lang.com/
 */
export class D2Generator {
  private options: Required<D2Options>;

  constructor(options: D2Options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate D2 diagram from ERDiagram
   * @param diagram - ER diagram to convert
   * @returns D2 diagram string
   */
  generate(diagram: ERDiagram): string {
    const lines: string[] = [];

    // Add direction
    lines.push(`direction: ${this.options.direction}`);
    lines.push('');

    // Generate entity definitions
    if (this.options.showProperties) {
      for (const entity of diagram.entities) {
        lines.push(...this.generateEntity(entity));
        lines.push('');
      }
    } else {
      // Just entity names
      for (const entity of diagram.entities) {
        lines.push(`${entity.name}`);
      }
      lines.push('');
    }

    // Generate relationships
    for (const rel of diagram.relationships) {
      lines.push(this.generateRelationship(rel));
    }

    return lines.join('\n').trim();
  }

  /**
   * Generate entity definition
   */
  private generateEntity(entity: Entity): string[] {
    const lines: string[] = [];
    lines.push(`${entity.name}: {`);
    lines.push(`  shape: ${this.options.shape}`);

    for (const prop of entity.properties) {
      lines.push(this.generateProperty(prop));
    }

    lines.push('}');
    return lines;
  }

  /**
   * Generate property line
   */
  private generateProperty(prop: Property): string {
    const typeName = this.formatTypeName(prop.type);
    const propName = this.sanitizeName(prop.name);

    let line = `  ${propName}: ${typeName}`;

    // Add constraint for key types
    if (this.options.showConstraints && prop.keyType) {
      const constraint = this.keyTypeToConstraint(prop.keyType);
      if (constraint) {
        line += ` {constraint: ${constraint}}`;
      }
    }

    return line;
  }

  /**
   * Convert key type to D2 constraint
   */
  private keyTypeToConstraint(keyType: 'PK' | 'FK' | 'UK'): string | null {
    switch (keyType) {
      case 'PK':
        return 'primary_key';
      case 'FK':
        return 'foreign_key';
      case 'UK':
        return 'unique';
      default:
        return null;
    }
  }

  /**
   * Generate relationship line
   */
  private generateRelationship(rel: Relationship): string {
    const arrow = this.getArrowStyle(rel);
    const label = rel.label ? `: ${rel.label}` : '';

    return `${rel.from} ${arrow} ${rel.to}${label}`;
  }

  /**
   * Get arrow style based on relationship
   */
  private getArrowStyle(rel: Relationship): string {
    // D2 uses simple arrows, we can indicate cardinality with labels
    // For now, use simple arrow
    return '->';
  }

  /**
   * Format type name for D2
   */
  private formatTypeName(type: PropertyType): string {
    let name = type.name;

    // Handle generic types
    if (type.typeArguments && type.typeArguments.length > 0) {
      const args = type.typeArguments.map(t => this.formatTypeName(t)).join(', ');
      name = `${name}<${args}>`;
    }

    // Handle arrays
    if (type.isArray) {
      name = `${name}[]`;
    }

    // Handle optional
    if (type.isOptional) {
      name = `${name}?`;
    }

    return name;
  }

  /**
   * Sanitize name for D2 compatibility
   */
  private sanitizeName(name: string): string {
    // D2 allows most characters, but we quote if needed
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return name;
    }
    // Quote names with special characters
    return `"${name}"`;
  }
}

/**
 * Generate D2 diagram from source code
 */
export async function generateD2FromSource(
  source: string,
  options?: D2Options
): Promise<string> {
  const { TscParser } = await import('../parser/tsc/TscParser.ts');
  const parser = new TscParser();
  const diagram = await parser.parseSource(source);
  const generator = new D2Generator(options);
  return generator.generate(diagram);
}

/**
 * Generate D2 diagram from files
 */
export async function generateD2FromFiles(
  filePaths: string[],
  options?: D2Options
): Promise<string> {
  const { TscParser } = await import('../parser/tsc/TscParser.ts');
  const parser = new TscParser();
  const diagram = await parser.parseFiles(filePaths);
  const generator = new D2Generator(options);
  return generator.generate(diagram);
}
