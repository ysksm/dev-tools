import { Command } from 'commander';
import { glob } from 'glob';
import * as http from 'http';
import * as path from 'path';
import { TscParser } from '../../core/parser/tsc/TscParser.ts';
import { MermaidGenerator } from '../../core/generator/MermaidGenerator.ts';

const parser = new TscParser();
const generator = new MermaidGenerator({
  showProperties: true,
  showAttributes: true,
});

async function generateDiagram(patterns: string[]): Promise<{
  mermaid: string;
  entities: number;
  relationships: number;
}> {
  const allFiles: string[] = [];
  for (const pattern of patterns) {
    const files = await glob(pattern, { absolute: true });
    allFiles.push(...files);
  }

  if (allFiles.length === 0) {
    return { mermaid: '', entities: 0, relationships: 0 };
  }

  const diagram = await parser.parseFiles(allFiles);
  const mermaid = generator.generate(diagram);

  return {
    mermaid,
    entities: diagram.entities.length,
    relationships: diagram.relationships.length,
  };
}

function createPreviewHTML(mermaid: string, entities: number, relationships: number, wsPort: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ER Diagram Preview</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #1e1e1e;
      color: #d4d4d4;
    }
    .container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    header {
      padding: 12px 20px;
      border-bottom: 1px solid #333;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .title { font-size: 18px; font-weight: 600; }
    .status { font-size: 12px; color: #888; }
    .status.connected { color: #4a4; }
    .status.disconnected { color: #f44; }
    main {
      flex: 1;
      overflow: auto;
      padding: 20px;
      display: flex;
      justify-content: center;
    }
    #diagram { background: #2d2d2d; padding: 20px; border-radius: 8px; }
    footer {
      padding: 8px 20px;
      border-top: 1px solid #333;
      font-size: 12px;
      color: #888;
    }
    .source-section {
      margin-top: 20px;
      padding: 16px;
      background-color: #2d2d2d;
      border-radius: 4px;
      max-width: 800px;
      width: 100%;
    }
    .source-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      color: #888;
      font-size: 12px;
    }
    .source-code {
      font-family: monospace;
      font-size: 12px;
      color: #d4d4d4;
      white-space: pre-wrap;
      margin: 0;
      max-height: 300px;
      overflow: auto;
    }
    .copy-btn {
      padding: 4px 8px;
      font-size: 11px;
      background-color: #3c3c3c;
      border: 1px solid #555;
      border-radius: 3px;
      color: #d4d4d4;
      cursor: pointer;
    }
    .copy-btn:hover { background-color: #4c4c4c; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <span class="title">TypeScript ER Diagram Preview</span>
      <span class="status" id="status">Connecting...</span>
    </header>
    <main>
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
        <div id="diagram"></div>
        <div class="source-section">
          <div class="source-header">
            <span>Mermaid Source</span>
            <button class="copy-btn" onclick="copySource()">Copy</button>
          </div>
          <pre class="source-code" id="source"></pre>
        </div>
      </div>
    </main>
    <footer id="footer">
      ${entities} entities, ${relationships} relationships
    </footer>
  </div>
  <script>
    let mermaidCode = ${JSON.stringify(mermaid)};

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    });

    async function renderDiagram() {
      const { svg } = await mermaid.render('mermaid-diagram', mermaidCode);
      document.getElementById('diagram').innerHTML = svg;
      document.getElementById('source').textContent = mermaidCode;
    }

    function copySource() {
      navigator.clipboard.writeText(mermaidCode);
      const btn = document.querySelector('.copy-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    }

    renderDiagram();

    // WebSocket for live reload
    const ws = new WebSocket('ws://localhost:${wsPort}');

    ws.onopen = () => {
      document.getElementById('status').textContent = 'Connected';
      document.getElementById('status').className = 'status connected';
    };

    ws.onclose = () => {
      document.getElementById('status').textContent = 'Disconnected';
      document.getElementById('status').className = 'status disconnected';
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update') {
        mermaidCode = data.mermaid;
        document.getElementById('mermaid-diagram')?.remove();
        await renderDiagram();
        document.getElementById('footer').textContent =
          data.entities + ' entities, ' + data.relationships + ' relationships';
      }
    };
  </script>
</body>
</html>`;
}

export const previewCommand = new Command('preview')
  .alias('p')
  .description('Open web preview with live reload')
  .argument('<patterns...>', 'Glob patterns for TypeScript files')
  .option('-p, --port <number>', 'HTTP server port', '3000')
  .option('-w, --ws-port <number>', 'WebSocket port', '3001')
  .option('--no-open', 'Do not open browser automatically')
  .action(async (patterns: string[], options: { port: string; wsPort: string; open: boolean }) => {
    const httpPort = parseInt(options.port, 10);
    const wsPort = parseInt(options.wsPort, 10);

    console.log('Starting preview server...');
    console.log(`Watching: ${patterns.join(', ')}`);

    // Initial generation
    let currentData = await generateDiagram(patterns);
    console.log(`Found ${currentData.entities} entities, ${currentData.relationships} relationships`);

    // HTTP server
    const server = http.createServer((req, res) => {
      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(createPreviewHTML(currentData.mermaid, currentData.entities, currentData.relationships, wsPort));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(httpPort, () => {
      console.log(`HTTP server: http://localhost:${httpPort}`);
    });

    // WebSocket server
    const { WebSocketServer } = await import('ws');
    const wss = new WebSocketServer({ port: wsPort });
    const clients = new Set<import('ws').WebSocket>();

    wss.on('connection', (ws) => {
      clients.add(ws);
      ws.on('close', () => clients.delete(ws));
    });

    console.log(`WebSocket server: ws://localhost:${wsPort}`);

    // File watcher
    const chokidar = await import('chokidar');
    const allFiles: string[] = [];
    for (const pattern of patterns) {
      const files = await glob(pattern, { absolute: true });
      allFiles.push(...files);
    }

    const watcher = chokidar.watch(allFiles, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100 },
    });

    watcher.on('change', async (filePath) => {
      console.log(`File changed: ${path.basename(filePath)}`);
      try {
        currentData = await generateDiagram(patterns);
        const message = JSON.stringify({
          type: 'update',
          mermaid: currentData.mermaid,
          entities: currentData.entities,
          relationships: currentData.relationships,
        });
        for (const client of clients) {
          client.send(message);
        }
        console.log(`Updated: ${currentData.entities} entities, ${currentData.relationships} relationships`);
      } catch (e) {
        console.error('Error generating diagram:', e);
      }
    });

    // Open browser
    if (options.open) {
      const open = (await import('open')).default;
      await open(`http://localhost:${httpPort}`);
    }

    console.log('\nPress Ctrl+C to stop');
  });
