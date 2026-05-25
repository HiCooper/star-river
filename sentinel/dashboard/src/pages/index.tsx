import { useEffect, useState } from 'react';
import { Issue, Service, OverviewStats, fetchIssues, fetchStats, fetchServices } from '../lib/api';

const sevStyles: Record<string, { bg: string; dot: string }> = {
  critical: { bg: 'rgba(239,68,68,0.15)', dot: '#EF4444' },
  high: { bg: 'rgba(249,115,22,0.15)', dot: '#F97316' },
  medium: { bg: 'rgba(234,179,8,0.15)', dot: '#EAB308' },
  low: { bg: 'rgba(34,197,94,0.15)', dot: '#22C55E' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Dashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [activeApp, setActiveApp] = useState<string>('');
  const [sevFilter, setSevFilter] = useState('');

  useEffect(() => {
    fetchServices().then(setServices);
    fetchStats().then(r => { if (r) setStats(r); });
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (activeApp) params.service = activeApp;
    if (sevFilter) params.severity = sevFilter;
    fetchIssues(params).then(r => setIssues(r.data));
  }, [activeApp, sevFilter]);

  const appStats = services.map(svc => ({
    ...svc,
    count: issues.filter(i => i.service_name === svc.name).length,
  }));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: 56,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>
          星河哨兵
        </span>
        <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 13 }}>
          Sentinel
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {stats ? `${stats.open_issues} open / ${stats.total_issues} total` : 'Loading...'}
        </span>
      </header>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px' }}>
        {/* App Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveApp('')}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              background: !activeApp ? 'var(--accent-glow)' : 'transparent',
              color: !activeApp ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              transition: 'var(--transition)',
            }}
          >
            All Apps
          </button>
          {services.map(svc => (
            <button
              key={svc.id}
              onClick={() => setActiveApp(svc.name)}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                background: activeApp === svc.name ? 'var(--accent-glow)' : 'transparent',
                color: activeApp === svc.name ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                transition: 'var(--transition)',
              }}
            >
              {svc.display_name || svc.name}
            </button>
          ))}
        </div>

        {/* Severity Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['', 'critical', 'high', 'medium', 'low'].map(sev => (
            <button
              key={sev}
              onClick={() => setSevFilter(sev)}
              style={{
                padding: '4px 12px', borderRadius: 12, border: '1px solid var(--border)',
                background: sevFilter === sev ? (sevStyles[sev]?.bg || 'var(--bg-hover)') : 'transparent',
                color: sevFilter === sev ? (sevStyles[sev]?.dot || 'var(--text-primary)') : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)',
                transition: 'var(--transition)',
              }}
            >
              {sev || 'All'}
            </button>
          ))}
        </div>

        {/* Issues List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {issues.map(issue => (
            <div
              key={issue.id}
              onClick={() => window.location.href = `/issues/${issue.id}`}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${sevStyles[issue.severity]?.dot || 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '14px 18px',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: sevStyles[issue.severity]?.bg || 'var(--bg-hover)',
                  color: sevStyles[issue.severity]?.dot || 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {issue.severity.toUpperCase()}
                </span>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 11,
                  background: 'var(--bg-primary)', color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {issue.service_name}
                </span>
                {issue.ai_category && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    AI: {issue.ai_category}/{issue.ai_severity}
                  </span>
                )}
                {issue.deep_diagnosis && (
                  <span style={{
                    padding: '2px 6px', borderRadius: 4, fontSize: 11,
                    background: 'rgba(59,130,246,0.15)', color: 'var(--info)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    🧠 精诊
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {timeAgo(issue.created_at)}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {issue.title}
              </div>
              {issue.ai_fix_suggestion && (
                <div style={{
                  marginTop: 8, fontSize: 12, color: 'var(--text-secondary)',
                  background: 'var(--bg-primary)', padding: '8px 12px',
                  borderRadius: 6, borderLeft: '2px solid var(--accent)',
                }}>
                  {issue.ai_fix_suggestion.slice(0, 120)}
                </div>
              )}
            </div>
          ))}
          {issues.length === 0 && (
            <div style={{
              textAlign: 'center', padding: 64, color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: 14,
            }}>
              暂无 Issue，系统运行正常 ✨
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
