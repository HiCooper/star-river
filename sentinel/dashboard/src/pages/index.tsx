import { useEffect, useState } from 'react';
import { Issue, fetchIssues, fetchStats, OverviewStats } from '../lib/api';

const severityColor: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#16a34a',
};

const statusLabel: Record<string, string> = {
  open: '开放',
  triaging: '分诊中',
  fixing: '修复中',
  fixed: '已修复',
  resolved: '已解决',
  ignored: '已忽略',
};

export default function IssueBoard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [filter, setFilter] = useState({ service: '', severity: '', status: '' });

  useEffect(() => {
    fetchStats().then(r => { if (r) setStats(r); });
  }, []);

  useEffect(() => {
    fetchIssues(filter).then(r => setIssues(r.data));
  }, [filter]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        <span style={{ color: '#3b82f6' }}>星河哨兵</span> · Issue 看板
      </h1>

      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {[
            ['总计', stats.total_issues, '#374151'],
            ['开放', stats.open_issues, '#ea580c'],
            ['严重', stats.critical_issues, '#dc2626'],
            ['高', stats.high_issues, '#ea580c'],
            ['已解决', stats.resolved_issues, '#16a34a'],
            ['自动修复', stats.auto_fixed, '#3b82f6'],
          ].map(([label, value, color]) => (
            <div key={label as string} style={{
              flex: 1, background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 8, padding: '12px 16px', textAlign: 'center'
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: color as string }}>{value as number}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{label as string}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input placeholder="服务名" value={filter.service}
          onChange={e => setFilter({ ...filter, service: e.target.value })}
          style={inputStyle} />
        <select value={filter.severity}
          onChange={e => setFilter({ ...filter, severity: e.target.value })}
          style={inputStyle}>
          <option value="">所有严重性</option>
          <option value="critical">严重</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <select value={filter.status}
          onChange={e => setFilter({ ...filter, status: e.target.value })}
          style={inputStyle}>
          <option value="">所有状态</option>
          <option value="open">开放</option>
          <option value="resolved">已解决</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {issues.map(issue => (
          <div key={issue.id} style={{
            background: '#fff', border: '1px solid #e5e7eb',
            borderLeft: `4px solid ${severityColor[issue.severity] || '#6b7280'}`,
            borderRadius: 8, padding: '16px 20px', cursor: 'pointer'
          }}
            onClick={() => window.location.href = `/issues/${issue.id}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                background: severityColor[issue.severity] || '#6b7280',
                color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600
              }}>
                {issue.severity.toUpperCase()}
              </span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{issue.service_name}</span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>|</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{issue.category}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, padding: '2px 8px', borderRadius: 4,
                background: issue.review_status === 'approved' ? '#dcfce7' : '#fef3c7',
                color: issue.review_status === 'approved' ? '#16a34a' : '#ca8a04'
              }}>
                {statusLabel[issue.status] || issue.status}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{issue.title}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              {new Date(issue.created_at).toLocaleString('zh-CN')}
              {issue.ai_auto_fixable === 'yes' && ` · AI 可自动修复 (${issue.ai_confidence}%)`}
              {issue.fix_pr_url && ` · PR: ${issue.fix_pr_url}`}
            </div>
          </div>
        ))}
        {issues.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: 48 }}>暂无 Issue，系统运行正常。</div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14,
  background: '#fff', minWidth: 120
};
