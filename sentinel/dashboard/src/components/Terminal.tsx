import dynamic from 'next/dynamic';
import '@xterm/xterm/css/xterm.css';

interface Props {
  title: string;
  content: string;
}

function TerminalViewerInner({ title, content }: Props) {
  // Dynamic import — xterm.js only runs in browser
  return null; // placeholder, actual render handled by dynamic import
}

const TerminalViewer = dynamic(() => import('./TerminalInner'), {
  ssr: false,
  loading: () => (
    <div style={{
      background: '#0a0a0a', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: 20, marginBottom: 16,
      color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)',
    }}>Loading terminal...</div>
  ),
});

export default TerminalViewer;
