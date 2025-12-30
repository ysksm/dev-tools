import { useState, useEffect, useRef } from 'react';
import { TscParser } from '../../core/parser/tsc/TscParser.js';
import { MermaidGenerator } from '../../core/generator/MermaidGenerator.js';

interface UseDiagramResult {
  mermaid: string;
  error: string | null;
  entities: number;
  relationships: number;
}

export function useDiagram(source: string): UseDiagramResult {
  const [result, setResult] = useState<UseDiagramResult>({
    mermaid: '',
    error: null,
    entities: 0,
    relationships: 0,
  });

  const parserRef = useRef<TscParser | null>(null);
  const generatorRef = useRef<MermaidGenerator | null>(null);

  useEffect(() => {
    if (!parserRef.current) {
      parserRef.current = new TscParser();
    }
    if (!generatorRef.current) {
      generatorRef.current = new MermaidGenerator({
        showProperties: true,
        showAttributes: true,
      });
    }
  }, []);

  useEffect(() => {
    const generateDiagram = async () => {
      if (!source.trim()) {
        setResult({
          mermaid: '',
          error: null,
          entities: 0,
          relationships: 0,
        });
        return;
      }

      if (!parserRef.current || !generatorRef.current) {
        return;
      }

      try {
        const diagram = await parserRef.current.parseSource(source);
        const mermaidCode = generatorRef.current.generate(diagram);

        setResult({
          mermaid: mermaidCode,
          error: null,
          entities: diagram.entities.length,
          relationships: diagram.relationships.length,
        });
      } catch (e) {
        setResult(prev => ({
          ...prev,
          error: e instanceof Error ? e.message : String(e),
        }));
      }
    };

    const timeoutId = setTimeout(generateDiagram, 300);
    return () => clearTimeout(timeoutId);
  }, [source]);

  return result;
}
