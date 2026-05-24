import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Issue, fetchIssue, approveIssue, rejectIssue } from '../../lib/api';

const severityColor: Record<string, string> = {
  critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a',
};

export default function IssueDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [issue, setIssue] = useState<Issue | null>(null);

  useEffect(() => {
    if (id) fetchIssue(id as string).then(r => setIssue(r.data));
  }, [id]);

  if (!issue) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>加载中...</div>;

  const sev = severityColor[issue.severity] || '#6b7280';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <a href="/" style={{ color: '#3b82f6', fontSize: 14 }}>← 返回看板</a>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 8 }}>
        <span style={{ background: sev, color: '#fff', padding: '4px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>
          {issue.severity.toUpperCase()}
        </span>
        <span style={{ fontSize: 14, color: '#6b7280' }}>{issue.service_name} · {issue.category}</span>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>{issue.title}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          ['服务', issue.service_name],
          ['分类', issue.category],
          ['严重性', issue.severity],
          ['状态', issue.status],
          ['审批状态', issue.review_status],
          ['首次发现', new Date(issue.first_seen_at).toLocaleString('zh-CN')],
          ['最近出现', new Date(issue.last_seen_at).toLocaleString('zh-CN')],
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#f9fafb', borderRadius: 6, padding: '8px 12px' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      {issue.ai_fix_suggestion && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#1d4ed8' }}>AI 修复建议</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{issue.ai_fix_suggestion}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
            置信度: {issue.ai_confidence}% · 可自动修复: {issue.ai_auto_fixable}
            {issue.ai_suspected_file && ` · 定位: ${issue.ai_suspected_file}`}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={async () => { await approveIssue(issue.id); router.reload(); }}
          style={{ padding: '8px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
          批准自动修复
        </button>
        <button
          onClick={async () => { await rejectIssue(issue.id); router.reload(); }}
          style={{ padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
          拒绝
        </button>
        <button onClick={() => router.push('/')}
          style={{ padding: '8px 20px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
          返回
        </button>
      </div>
    </div>
  );
}
