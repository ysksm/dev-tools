/**
 * Benchmark comparison between SWC and TypeScript Compiler API parsers
 */

import { SwcParser } from '../src/core/parser/swc/SwcParser.js';
import { TscParser } from '../src/core/parser/tsc/TscParser.js';

// Generate large test fixture
function generateLargeFixture(interfaceCount: number): string {
  const interfaces: string[] = [];

  for (let i = 0; i < interfaceCount; i++) {
    interfaces.push(`
interface Entity${i} {
  id: string;
  name: string;
  description?: string;
  count: number;
  active: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  ${i > 0 ? `parent?: Entity${i - 1};` : ''}
  ${i < interfaceCount - 1 ? `children: Entity${i + 1}[];` : ''}
}
`);
  }

  return interfaces.join('\n');
}

async function runBenchmark(name: string, fn: () => Promise<void>, iterations: number): Promise<number> {
  // Warmup
  for (let i = 0; i < 3; i++) {
    await fn();
  }

  // Measure
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`${name}:`);
  console.log(`  Avg: ${avg.toFixed(2)}ms`);
  console.log(`  Min: ${min.toFixed(2)}ms`);
  console.log(`  Max: ${max.toFixed(2)}ms`);

  return avg;
}

async function main() {
  const testCases = [
    { name: 'Small (10 interfaces)', count: 10 },
    { name: 'Medium (100 interfaces)', count: 100 },
    { name: 'Large (500 interfaces)', count: 500 },
    { name: 'Very Large (1000 interfaces)', count: 1000 },
  ];

  console.log('='.repeat(60));
  console.log('Parser Benchmark Comparison');
  console.log('='.repeat(60));
  console.log();

  const results: { name: string; swc: number; tsc: number }[] = [];

  for (const { name, count } of testCases) {
    console.log(`\n--- ${name} ---\n`);

    const fixture = generateLargeFixture(count);
    const swcParser = new SwcParser();
    const tscParser = new TscParser();

    const swcTime = await runBenchmark(
      'SWC',
      async () => { await swcParser.parseSource(fixture); },
      5
    );

    console.log();

    const tscTime = await runBenchmark(
      'TSC',
      async () => { await tscParser.parseSource(fixture); },
      5
    );

    const speedup = tscTime / swcTime;
    console.log(`\nSWC is ${speedup.toFixed(2)}x ${speedup > 1 ? 'faster' : 'slower'} than TSC`);

    results.push({ name, swc: swcTime, tsc: tscTime });
  }

  // Summary table
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log();
  console.log('| Test Case | SWC (ms) | TSC (ms) | Speedup |');
  console.log('|-----------|----------|----------|---------|');
  for (const r of results) {
    const speedup = r.tsc / r.swc;
    console.log(`| ${r.name.padEnd(20)} | ${r.swc.toFixed(1).padStart(8)} | ${r.tsc.toFixed(1).padStart(8)} | ${speedup.toFixed(2).padStart(7)}x |`);
  }
}

main().catch(console.error);
