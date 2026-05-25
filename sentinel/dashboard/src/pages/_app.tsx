import type { AppProps } from 'next/app'
import Head from 'next/head'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>星河哨兵 · Sentinel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <style jsx global>{`
        :root {
          --bg-primary: #0F172A;
          --bg-secondary: #1E293B;
          --bg-card: #1E293B;
          --bg-hover: #334155;
          --border: #334155;
          --text-primary: #F8FAFC;
          --text-secondary: #94A3B8;
          --text-muted: #64748B;
          --accent: #22C55E;
          --accent-glow: rgba(34,197,94,0.15);
          --destructive: #EF4444;
          --warning: #F59E0B;
          --info: #3B82F6;
          --critical: #EF4444;
          --high: #F97316;
          --medium: #EAB308;
          --low: #22C55E;
          --font-mono: 'Fira Code', monospace;
          --font-sans: 'Fira Sans', system-ui, sans-serif;
          --radius: 8px;
          --transition: all 0.2s ease;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 14px;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg-primary); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
      `}</style>
      <Component {...pageProps} />
    </>
  )
}
