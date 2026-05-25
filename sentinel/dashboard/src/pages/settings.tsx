import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082';

interface Settings {
  [key: string]: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [saved, setSaved] = useState('');

  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/settings`).then(r => r.json()).then(d => {
      if (d.success) setSettings(d.data);
    });
  }, []);

  const save = async (key: string, value: string) => {
    await fetch(`${BASE_URL}/api/v1/settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    setSaved(key);
    setTimeout(() => setSaved(''), 1500);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: 'var(--bg-primary)',
    border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)',
    outline: 'none',
  };

  const fields = [
    { key: 'notify_dingtalk_url', label: '钉钉 Webhook URL', hint: '钉钉群机器人 Incoming Webhook 地址' },
    { key: 'notify_feishu_url', label: '飞书 Webhook URL', hint: '飞书群机器人 Webhook 地址' },
    { key: 'notify_slack_url', label: 'Slack Webhook URL', hint: 'Slack Incoming Webhook URL' },
  ];

  return (
    <Layout>
      <div style={{ padding: '24px 28px', maxWidth: 700 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
          系统设置
        </h2>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>
          配置通知渠道，Issue 创建/审批/修复完成时自动推送消息。
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fields.map(f => (
            <div key={f.key} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {f.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{f.hint}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={settings[f.key] || ''}
                  onChange={e => setSettings({ ...settings, [f.key]: e.target.value })}
                  placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx"
                  style={inputStyle}
                />
                <button onClick={() => save(f.key, settings[f.key] || '')} style={{
                  padding: '8px 16px', background: saved === f.key ? 'var(--accent)' : 'var(--bg-hover)',
                  color: saved === f.key ? '#000' : 'var(--text-secondary)',
                  border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
                  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap', transition: 'var(--transition)',
                }}>
                  {saved === f.key ? '已保存' : '保存'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
