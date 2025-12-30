import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface PreviewProps {
  mermaid: string;
  error: string | null;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
    backgroundColor: '#1e1e1e',
  },
  error: {
    color: '#f44',
    padding: '20px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
  },
  diagram: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    minHeight: '100%',
  },
  source: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#2d2d2d',
    borderRadius: '4px',
  },
  sourceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    color: '#888',
    fontSize: '12px',
  },
  sourceCode: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#d4d4d4',
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
  copyButton: {
    padding: '4px 8px',
    fontSize: '11px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #555',
    borderRadius: '3px',
    color: '#d4d4d4',
    cursor: 'pointer',
  },
};

export default function Preview({ mermaid: mermaidCode, error }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || !mermaidCode || error) return;

    const render = async () => {
      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, mermaidCode);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre style="color: #f44;">${e}</pre>`;
        }
      }
    };

    render();
  }, [mermaidCode, error]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.diagram} ref={containerRef} />

      <div style={styles.source}>
        <div style={styles.sourceHeader}>
          <span>Mermaid Source</span>
          <button style={styles.copyButton} onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre style={styles.sourceCode}>{mermaidCode}</pre>
      </div>
    </div>
  );
}
