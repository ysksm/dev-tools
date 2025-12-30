import React, { useState, useCallback, useEffect } from 'react';
import Editor from './Editor';
import Preview from './Preview';
import { useDiagram } from '../hooks/useDiagram';

const DEFAULT_SOURCE = `/**
 * User entity
 */
interface User {
  /** @pk */
  id: string;
  name: string;
  email: string;
  posts: Post[];
}

/**
 * Blog post
 */
interface Post {
  /** @pk */
  id: string;
  /** @fk */
  authorId: string;
  title: string;
  content: string;
  comments: Comment[];
}

/**
 * Comment on a post
 */
interface Comment {
  /** @pk */
  id: string;
  /** @fk */
  postId: string;
  /** @fk */
  userId: string;
  text: string;
}
`;

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  header: {
    padding: '12px 20px',
    borderBottom: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  panel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelHeader: {
    padding: '8px 16px',
    borderBottom: '1px solid #333',
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  divider: {
    width: '4px',
    backgroundColor: '#333',
    cursor: 'col-resize',
  },
  status: {
    padding: '8px 20px',
    borderTop: '1px solid #333',
    fontSize: '12px',
    color: '#888',
  },
};

export default function App() {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const { mermaid, error, entities, relationships } = useDiagram(source);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <span style={styles.title}>TypeScript ER Diagram Generator</span>
      </header>

      <main style={styles.main}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>TypeScript Input</div>
          <Editor value={source} onChange={setSource} />
        </div>

        <div style={styles.divider} />

        <div style={styles.panel}>
          <div style={styles.panelHeader}>ER Diagram Preview</div>
          <Preview mermaid={mermaid} error={error} />
        </div>
      </main>

      <footer style={styles.status}>
        {error ? (
          <span style={{ color: '#f44' }}>{error}</span>
        ) : (
          <span>
            {entities} entities, {relationships} relationships
          </span>
        )}
      </footer>
    </div>
  );
}
