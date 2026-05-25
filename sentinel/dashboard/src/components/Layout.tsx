import { useRouter } from 'next/router';
import { ReactNode } from 'react';

const navItems = [
  { label: 'Issue 看板', path: '/', icon: '◉' },
  { label: '服务配置', path: '/services', icon: '⚙' },
  { label: '系统设置', path: '/settings', icon: '⚡' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, minWidth: 220, height: "100vh", position: "sticky", top: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
            星河哨兵
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Sentinel
          </span>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(item => {
            const active = router.pathname === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 'var(--radius)',
                  marginBottom: 2,
                  background: active ? 'var(--accent-glow)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 400,
                  fontFamily: 'var(--font-sans)',
                  transition: 'var(--transition)',
                }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
                {active && (
                  <span style={{
                    marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%',
                    background: 'var(--accent)',
                  }} />
                )}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
        }}>
          Star-River v0.1
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
