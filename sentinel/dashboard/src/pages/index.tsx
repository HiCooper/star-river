import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Issue, Service, OverviewStats, fetchIssues, fetchStats, fetchServices } from '../lib/api';

const sevStyles: Record<string, { bg: string; dot: string }> = {
  critical: { bg: 'rgba(239,68,68,0.15)', dot: '#EF4444' },
  high: { bg: 'rgba(249,115,22,0.15)', dot: '#F97316' },
  medium: { bg: 'rgba(234,179,8,0.15)', dot: '#EAB308' },
  low: { bg: 'rgba(34,197,94,0.15)', dot: '#22C55E' },
};

function getStatus(issue: Issue): { label: string; color: string; bg: string } {
  const st = issue.status;
  const rv = issue.review_status;
  const fs = issue.fix_status;
  const ft = issue.fix_type;
  const pr = issue.fix_pr_url;
  const af = issue.ai_auto_fixable;

  if (st === 'resolved') return { label: '已解决', color: '#22C55E', bg: 'rgba(34,197,94,0.15)' };
  if (st === 'ignored') return { label: '已忽略', color: '#64748B', bg: 'rgba(100,116,139,0.15)' };

  if (fs === 'succeeded' || (pr && ft === 'auto')) return { label: '已提交PR', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' };
  if (fs === 'in_progress' || ft === 'auto') return { label: '自动修复中', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' };
  if (fs === 'failed') return { label: '修复失败', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' };

  if (rv === 'approved') return { label: '已批准·待修复', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' };
  if (rv === 'rejected') return { label: '已拒绝', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' };

  if (af === 'yes') return { label: '待人工确认', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
  if (af === 'maybe') return { label: '待评估', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };

  return { label: '待处理', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
}

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

  return (
    <Layout>
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              Issue 看板
            </h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {stats ? `${stats.open_issues} open · ${stats.total_issues} total · ${stats.critical_issues} critical` : 'Loading...'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setActiveApp('')} style={{
            padding: '6px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            background: !activeApp ? 'var(--accent-glow)' : 'transparent',
            color: !activeApp ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
            transition: 'var(--transition)',
          }}>All Apps</button>
          {services.map(svc => (
            <button key={svc.id} onClick={() => setActiveApp(svc.name)} style={{
              padding: '6px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              background: activeApp === svc.name ? 'var(--accent-glow)' : 'transparent',
              color: activeApp === svc.name ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
              transition: 'var(--transition)',
            }}>{svc.display_name || svc.name}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['', 'critical', 'high', 'medium', 'low'].map(sev => (
            <button key={sev} onClick={() => setSevFilter(sev)} style={{
              padding: '3px 10px', borderRadius: 12, border: '1px solid var(--border)',
              background: sevFilter === sev ? (sevStyles[sev]?.bg || 'var(--bg-hover)') : 'transparent',
              color: sevFilter === sev ? (sevStyles[sev]?.dot || 'var(--text-primary)') : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-sans)', transition: 'var(--transition)',
            }}>{sev || 'All'}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {issues.map(issue => {
            const status = getStatus(issue);
            return (
              <div key={issue.id} onClick={() => window.location.href = `/issues/${issue.id}`} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderLeft: `3px solid ${sevStyles[issue.severity]?.dot || 'var(--border)'}`,
                borderRadius: 'var(--radius)', padding: '12px 16px', cursor: 'pointer',
                transition: 'var(--transition)',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    background: sevStyles[issue.severity]?.bg, color: sevStyles[issue.severity]?.dot,
                    fontFamily: 'var(--font-mono)',
                  }}>{issue.severity.toUpperCase()}</span>
                  <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10,
                    background: 'var(--bg-primary)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                  }}>{issue.service_name}</span>
                  {issue.ai_category && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI: {issue.ai_category}/{issue.ai_severity}</span>}
                  {issue.deep_diagnosis && <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10,
                    background: 'rgba(59,130,246,0.15)', color: 'var(--info)', fontFamily: 'var(--font-mono)',
                  }}>精诊</span>}
                  {/* Status badge */}
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                    background: status.bg, color: status.color, fontFamily: 'var(--font-mono)',
                    marginLeft: 'auto',
                  }}>{status.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{timeAgo(issue.created_at)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{issue.title}</div>
                {issue.ai_fix_suggestion && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)',
                    background: 'var(--bg-primary)', padding: '6px 10px', borderRadius: 6,
                    borderLeft: '2px solid var(--accent)',
                  }}>{issue.ai_fix_suggestion.slice(0, 120)}</div>
                )}
              </div>
            );
          })}
          {issues.length === 0 && (
            <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
              暂无 Issue ✨
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
