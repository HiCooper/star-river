import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from 'xterm-addon-fit';

interface Props {
  title: string;
  content: string;
}

export default function TerminalViewer({ title, content }: Props) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current || !content) return;

    if (termRef.current) {
      termRef.current.dispose();
    }

    const term = new Terminal({
      theme: {
        background: '#0a0a0a',
        foreground: '#94A3B8',
        cursor: '#22C55E',
        selectionBackground: '#334155',
        black: '#1E293B', red: '#EF4444', green: '#22C55E', yellow: '#EAB308',
        blue: '#3B82F6', magenta: '#8B5CF6', cyan: '#06B6D4', white: '#F8FAFC',
        brightBlack: '#475569', brightRed: '#F87171', brightGreen: '#4ADE80',
        brightYellow: '#FBBF24', brightBlue: '#60A5FA', brightMagenta: '#A78BFA',
        brightCyan: '#22D3EE', brightWhite: '#FFFFFF',
      },
      fontFamily: '"Fira Code", monospace',
      fontSize: 12, lineHeight: 1.4,
      cursorBlink: false, disableStdin: true,
      scrollback: 5000,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);

    if (terminalRef.current) {
      term.open(terminalRef.current);
      setTimeout(() => { try { fit.fit(); } catch {} }, 50);
    }

    term.write(content.replace(/\n/g, '\r\n'));

    termRef.current = term;

    return () => { term.dispose(); };
  }, [content]);

  return (
    <div style={{
      background: '#0a0a0a', border: '1px solid var(--border)',
      borderRadius: '0 0 8px 8px', overflow: 'hidden', marginBottom: 16,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 14px', background: '#111', borderBottom: '1px solid #1a1a1a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EAB308', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
        </div>
        <span style={{ color: '#64748B', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{title}</span>
        <span style={{ width: 40 }} />
      </div>
      <div ref={terminalRef} style={{ minHeight: 200, maxHeight: 500 }} />
    </div>
  );
}
