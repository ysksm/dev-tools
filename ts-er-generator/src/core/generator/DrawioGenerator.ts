import type {
  ERDiagram,
  Entity,
  Relationship,
  Property,
  PropertyType,
} from '../../models/index.ts';

/**
 * Options for Draw.io diagram generation
 */
export interface DrawioOptions {
  /** Entity width */
  entityWidth?: number;
  /** Row height for properties */
  rowHeight?: number;
  /** Horizontal spacing between entities */
  horizontalSpacing?: number;
  /** Vertical spacing between entities */
  verticalSpacing?: number;
  /** Entities per row */
  entitiesPerRow?: number;
  /** Show key type markers (PK, FK, UK) */
  showKeyTypes?: boolean;
}

const DEFAULT_OPTIONS: Required<DrawioOptions> = {
  entityWidth: 200,
  rowHeight: 26,
  horizontalSpacing: 80,
  verticalSpacing: 80,
  entitiesPerRow: 3,
  showKeyTypes: true,
};

interface CellPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Generator for Draw.io (diagrams.net) XML format
 */
export class DrawioGenerator {
  private options: Required<DrawioOptions>;
  private cellId: number = 2; // Start from 2 (0 and 1 are reserved)
  private entityPositions: Map<string, CellPosition> = new Map();
  private entityCellIds: Map<string, string> = new Map();

  constructor(options: DrawioOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate Draw.io XML from ERDiagram
   */
  generate(diagram: ERDiagram): string {
    this.cellId = 2;
    this.entityPositions.clear();
    this.entityCellIds.clear();

    // Calculate positions for entities
    this.calculateEntityPositions(diagram.entities);

    const cells: string[] = [];

    // Add root cells
    cells.push('      <mxCell id="0" />');
    cells.push('      <mxCell id="1" parent="0" />');

    // Generate entity cells
    for (const entity of diagram.entities) {
      cells.push(...this.generateEntity(entity));
    }

    // Generate relationship cells
    for (const rel of diagram.relationships) {
      cells.push(this.generateRelationship(rel));
    }

    return this.wrapInDocument(cells.join('\n'));
  }

  /**
   * Calculate positions for entities in a grid layout
   */
  private calculateEntityPositions(entities: Entity[]): void {
    const { entityWidth, rowHeight, horizontalSpacing, verticalSpacing, entitiesPerRow } = this.options;

    entities.forEach((entity, index) => {
      const col = index % entitiesPerRow;
      const row = Math.floor(index / entitiesPerRow);

      // Calculate entity height based on properties
      const headerHeight = 30;
      const propertiesHeight = entity.properties.length * rowHeight;
      const height = headerHeight + propertiesHeight;

      // Calculate max height in the row for proper spacing
      const x = col * (entityWidth + horizontalSpacing) + 40;
      const y = row * (200 + verticalSpacing) + 40;

      this.entityPositions.set(entity.name, { x, y, width: entityWidth, height });
    });
  }

  /**
   * Generate entity as a table
   */
  private generateEntity(entity: Entity): string[] {
    const cells: string[] = [];
    const pos = this.entityPositions.get(entity.name)!;
    const { rowHeight } = this.options;

    // Entity container (table)
    const entityId = this.nextId();
    this.entityCellIds.set(entity.name, entityId);

    const headerHeight = 30;
    const totalHeight = headerHeight + entity.properties.length * rowHeight;

    // Table container
    cells.push(
      `      <mxCell id="${entityId}" value="${this.escapeXml(entity.name)}" ` +
      `style="swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=${headerHeight};` +
      `horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=0;` +
      `marginBottom=0;fillColor=#dae8fc;strokeColor=#6c8ebf;" ` +
      `vertex="1" parent="1">`
    );
    cells.push(
      `        <mxGeometry x="${pos.x}" y="${pos.y}" width="${pos.width}" height="${totalHeight}" as="geometry" />`
    );
    cells.push('      </mxCell>');

    // Property rows
    for (const prop of entity.properties) {
      cells.push(this.generatePropertyRow(prop, entityId));
    }

    return cells;
  }

  /**
   * Generate property row
   */
  private generatePropertyRow(prop: Property, parentId: string): string {
    const { rowHeight, showKeyTypes } = this.options;
    const propId = this.nextId();

    const typeName = this.formatTypeName(prop.type);
    let displayName = `${prop.name}: ${typeName}`;

    if (showKeyTypes && prop.keyType) {
      displayName = `[${prop.keyType}] ${displayName}`;
    }

    // Different background for PK
    const fillColor = prop.keyType === 'PK' ? '#fff2cc' : '#ffffff';
    const strokeColor = prop.keyType === 'PK' ? '#d6b656' : '#6c8ebf';

    return (
      `      <mxCell id="${propId}" value="${this.escapeXml(displayName)}" ` +
      `style="text;strokeColor=${strokeColor};fillColor=${fillColor};align=left;` +
      `verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;` +
      `portConstraint=eastwest;rotatable=0;fontFamily=monospace;fontSize=11;" ` +
      `vertex="1" parent="${parentId}">` +
      `\n        <mxGeometry y="30" width="${this.options.entityWidth}" height="${rowHeight}" as="geometry" />` +
      `\n      </mxCell>`
    );
  }

  /**
   * Generate relationship as edge
   */
  private generateRelationship(rel: Relationship): string {
    const relId = this.nextId();
    const sourceId = this.entityCellIds.get(rel.from);
    const targetId = this.entityCellIds.get(rel.to);

    if (!sourceId || !targetId) {
      return '';
    }

    const label = rel.label || '';
    const startArrow = this.getStartArrow(rel.cardinality);
    const endArrow = this.getEndArrow(rel.cardinality);

    return (
      `      <mxCell id="${relId}" value="${this.escapeXml(label)}" ` +
      `style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;` +
      `jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;` +
      `entryX=0;entryY=0.5;entryDx=0;entryDy=0;` +
      `startArrow=${startArrow};startFill=1;endArrow=${endArrow};endFill=1;` +
      `strokeColor=#666666;fontColor=#333333;fontSize=10;" ` +
      `edge="1" parent="1" source="${sourceId}" target="${targetId}">` +
      `\n        <mxGeometry relative="1" as="geometry" />` +
      `\n      </mxCell>`
    );
  }

  /**
   * Get start arrow based on cardinality
   */
  private getStartArrow(cardinality: string): string {
    if (cardinality.startsWith('one-to')) {
      return 'none';
    }
    if (cardinality.startsWith('zero-or-one')) {
      return 'oval';
    }
    if (cardinality.startsWith('many')) {
      return 'ERmany';
    }
    return 'none';
  }

  /**
   * Get end arrow based on cardinality
   */
  private getEndArrow(cardinality: string): string {
    if (cardinality.endsWith('to-one')) {
      return 'ERone';
    }
    if (cardinality.endsWith('to-zero-or-one')) {
      return 'ERoneToMany';
    }
    if (cardinality.endsWith('to-many')) {
      return 'ERmany';
    }
    if (cardinality.endsWith('to-zero-or-more')) {
      return 'ERmany';
    }
    return 'ERone';
  }

  /**
   * Format type name
   */
  private formatTypeName(type: PropertyType): string {
    let name = type.name;

    if (type.isArray) {
      name = `${name}[]`;
    }

    if (type.isOptional) {
      name = `${name}?`;
    }

    return name;
  }

  /**
   * Get next cell ID
   */
  private nextId(): string {
    return String(this.cellId++);
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Wrap cells in Draw.io document structure
   */
  private wrapInDocument(cells: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" type="device">
  <diagram name="ER Diagram" id="er-diagram">
    <mxGraphModel dx="1000" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
${cells}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
  }
}

/**
 * Generate Draw.io diagram from source code
 */
export async function generateDrawioFromSource(
  source: string,
  options?: DrawioOptions
): Promise<string> {
  const { TscParser } = await import('../parser/tsc/TscParser.ts');
  const parser = new TscParser();
  const diagram = await parser.parseSource(source);
  const generator = new DrawioGenerator(options);
  return generator.generate(diagram);
}

/**
 * Generate Draw.io diagram from files
 */
export async function generateDrawioFromFiles(
  filePaths: string[],
  options?: DrawioOptions
): Promise<string> {
  const { TscParser } = await import('../parser/tsc/TscParser.ts');
  const parser = new TscParser();
  const diagram = await parser.parseFiles(filePaths);
  const generator = new DrawioGenerator(options);
  return generator.generate(diagram);
}
