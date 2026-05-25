import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Issue, fetchIssue, approveIssue, rejectIssue } from '../../lib/api';

const sevColor: Record<string, string> = { critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#22C55E' };

function DeepDiagnosis({ issue }: { issue: Issue }) {
  if (!issue.deep_diagnosis) return null;
  try {
    const d = typeof issue.deep_diagnosis === 'string' ? JSON.parse(issue.deep_diagnosis) : issue.deep_diagnosis;
    const raw = d.raw_output || d.RawOutput || '';
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--info)', borderRadius: 'var(--radius)', padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--info)', fontFamily: 'var(--font-mono)' }}>Claude Code 精诊分析</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>根因分析</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{d.root_cause || d.RootCause || '-'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>修复方案</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{d.fix_plan || d.FixPlan || '-'}</div>
        </div>
        {raw && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
              Claude Code 控制台输出
            </summary>
            <pre style={{
              background: '#0a0a0a', color: '#94A3B8', padding: '10px 14px',
              borderRadius: 4, marginTop: 8, overflow: 'auto', maxHeight: 400,
              fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>{raw}</pre>
          </details>
        )}
      </div>
    );
  } catch { return null; }
}

function FixLog({ issue }: { issue: Issue }) {
  if (!issue.fix_log) return null;
  try {
    const log = typeof issue.fix_log === 'string' ? JSON.parse(issue.fix_log) : issue.fix_log;
    const steps: any[] = log.steps || [];
    if (steps.length === 0) return null;

    return (
      <div style={{ background: '#0a0a0a', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>执行日志</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Pipeline Console</span>
        </div>
        {steps.map((step: any, idx: number) => (
          <div key={idx} style={{ marginBottom: idx < steps.length - 1 ? 10 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                background: step.status === 'ok' ? '#22C55E' : step.status === 'failed' ? '#EF4444' : '#F59E0B',
              }} />
              <span style={{ color: step.status === 'ok' ? '#22C55E' : step.status === 'failed' ? '#EF4444' : '#F59E0B', fontWeight: 500 }}>
                {step.step}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                {step.status === 'ok' ? 'OK' : step.status === 'failed' ? 'FAILED' : '...'}
              </span>
            </div>
            {step.output && (
              <pre style={{
                background: '#111', color: '#94A3B8', padding: '8px 12px', borderRadius: 4,
                margin: '4px 0 0 16px', overflow: 'auto', maxHeight: 300, fontSize: 11,
                lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                borderLeft: step.status === 'failed' ? '2px solid #EF4444' : '2px solid #334155',
              }}>
                {step.output.slice(0, 3000)}
              </pre>
            )}
            {step.error && (
              <pre style={{
                background: '#1a0000', color: '#EF4444', padding: '6px 12px', borderRadius: 4,
                margin: '4px 0 0 16px', fontSize: 11, whiteSpace: 'pre-wrap',
              }}>
                {step.error}
              </pre>
            )}
          </div>
        ))}
      </div>
    );
  } catch { return null; }
}

export default function IssueDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [issue, setIssue] = useState<Issue | null>(null);

  useEffect(() => {
    if (id) fetchIssue(id as string).then(r => { if (r) setIssue(r); });
  }, [id]);

  if (!issue) return (
    <Layout><div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>加载中...</div></Layout>
  );

  const sev = sevColor[issue.severity] || '#64748B';

  return (
    <Layout>
      <div style={{ padding: '24px 28px', maxWidth: 960 }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 13, textDecoration: 'none', fontFamily: 'var(--font-mono)', marginBottom: 20 }}>← 返回 Issue 列表</a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ padding: '4px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600, background: `${sev}22`, color: sev, fontFamily: 'var(--font-mono)' }}>{issue.severity.toUpperCase()}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>{issue.service_name} · {issue.category}</span>
          {issue.deep_diagnosis && <span style={{ padding: '4px 10px', borderRadius: 4, fontSize: 12, background: 'rgba(59,130,246,0.15)', color: 'var(--info)', fontFamily: 'var(--font-mono)' }}>精诊完成</span>}
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 28, color: 'var(--text-primary)' }}>{issue.title}</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[['服务', issue.service_name], ['分类', issue.category], ['严重性', issue.severity], ['状态', issue.status],
            ['AI 分类', issue.ai_category || '-'], ['AI 严重性', issue.ai_severity || '-'],
            ['可自动修复', issue.ai_auto_fixable || '-'], ['AI 置信度', `${issue.ai_confidence}%`],
            ['首次发现', new Date(issue.first_seen_at).toLocaleString('zh-CN')], ['审批状态', issue.review_status],
          ].map(([label, value]) => (
            <div key={label} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '10px 14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>

        {issue.ai_fix_suggestion && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>AI 修复建议</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{issue.ai_fix_suggestion}</div>
          </div>
        )}

        <DeepDiagnosis issue={issue} />
        <FixLog issue={issue} />

        {issue.review_status === 'pending' && issue.ai_auto_fixable === 'yes' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={async () => { await approveIssue(issue.id); router.reload(); }} style={{ padding: '8px 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)' }}>批准自动修复</button>
            <button onClick={async () => { await rejectIssue(issue.id); router.reload(); }} style={{ padding: '8px 20px', background: 'var(--destructive)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)' }}>拒绝</button>
          </div>
        )}
        {issue.review_status === 'approved' && (
          <div style={{ padding: '8px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>已批准 · 等待自动修复执行</div>
        )}
        {issue.review_status === 'rejected' && (
          <div style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--destructive)', fontFamily: 'var(--font-mono)' }}>已拒绝 · 需人工处理</div>
        )}
        {issue.fix_pr_url && (
          <div style={{ padding: '8px 16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--info)', fontFamily: 'var(--font-mono)', marginTop: 12 }}>
            PR: <a href={issue.fix_pr_url} target="_blank" style={{ color: 'var(--info)' }}>{issue.fix_pr_url}</a>
          </div>
        )}
      </div>
    </Layout>
  );
}
