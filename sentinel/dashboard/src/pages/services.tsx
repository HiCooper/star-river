import { useEffect, useState } from 'react';
import { Service, fetchServices } from '../lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Service | null>(null);
  const [repoPath, setRepoPath] = useState('');
  const [docsPath, setDocsPath] = useState('');
  const [saved, setSaved] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDisplay, setNewDisplay] = useState('');
  const [newRepo, setNewRepo] = useState('');
  const [newLang, setNewLang] = useState('go');
  const [newTeam, setNewTeam] = useState('');

  useEffect(() => { fetchServices().then(setServices); }, []);

  const openEdit = (svc: Service) => {
    setEditing(svc);
    setRepoPath(svc.repo_local_path || '');
    setDocsPath(svc.docs_path || '');
    setSaved(false);
  };

  const saveConfig = async () => {
    if (!editing) return;
    await fetch(`${BASE_URL}/api/v1/services/${editing.name}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_local_path: repoPath, docs_path: docsPath }),
    });
    setSaved(true);
    fetchServices().then(setServices);
    setTimeout(() => setSaved(false), 2000);
  };

  const addService = async () => {
    if (!newName) return;
    await fetch(`${BASE_URL}/api/v1/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName, display_name: newDisplay, repo_url: newRepo,
        language: newLang, owner_team: newTeam,
      }),
    });
    setShowAdd(false);
    setNewName(''); setNewDisplay(''); setNewRepo(''); setNewLang('go'); setNewTeam('');
    fetchServices().then(setServices);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: 'var(--bg-card)',
    border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)',
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'var(--font-sans)' }}>
      <header style={{
        borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
        padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 16,
      }}>
        <a href="/" style={{ color: 'var(--accent)', fontSize: 14, textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
          ← 看板
        </a>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>服务配置</span>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          marginLeft: 'auto', padding: '5px 14px', background: 'var(--accent)', color: '#000',
          border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
          fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
        }}>
          + 添加服务
        </button>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Add Service Form */}
        {showAdd && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--accent)',
            borderRadius: 'var(--radius)', padding: 20, marginBottom: 20,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 16 }}>
              注册新服务
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  服务名称 * (唯一标识)
                </label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="hydra-wall" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  显示名称
                </label>
                <input value={newDisplay} onChange={e => setNewDisplay(e.target.value)} placeholder="Hydra 付费墙" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Git 仓库地址
                </label>
                <input value={newRepo} onChange={e => setNewRepo(e.target.value)} placeholder="https://github.com/xxx" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>语言</label>
                <select value={newLang} onChange={e => setNewLang(e.target.value)} style={inputStyle}>
                  <option value="go">Go</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={addService} style={{
                padding: '6px 20px', background: 'var(--accent)', color: '#000',
                border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
              }}>创建</button>
              <button onClick={() => setShowAdd(false)} style={{
                padding: '6px 20px', background: 'transparent', color: 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)',
              }}>取消</button>
            </div>
          </div>
        )}

        {/* Service Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {services.map(svc => (
            <div key={svc.id} style={{
              background: 'var(--bg-card)', border: editing?.id === svc.id ? '1px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '18px 20px', transition: 'var(--transition)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {svc.display_name || svc.name}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{svc.name}</span>
                  <span style={{ marginLeft: 8, padding: '2px 6px', borderRadius: 4, fontSize: 10,
                    background: svc.language === 'go' ? 'rgba(59,130,246,0.15)' : 'rgba(234,179,8,0.15)',
                    color: svc.language === 'go' ? 'var(--info)' : 'var(--warning)', fontFamily: 'var(--font-mono)',
                  }}>{svc.language || 'go'}</span>
                </div>
                <button onClick={() => openEdit(svc)} style={{
                  padding: '5px 14px', background: editing?.id === svc.id ? 'var(--accent)' : 'transparent',
                  color: editing?.id === svc.id ? '#000' : 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)', transition: 'var(--transition)',
                }}>配置</button>
              </div>
              <div style={{ display: 'flex', gap: 24, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Repo: {svc.repo_url || '-'}</span>
                <span style={{ color: svc.repo_local_path ? 'var(--accent)' : 'var(--text-muted)' }}>
                  本地路径: {svc.repo_local_path || '未配置'}
                </span>
                <span style={{ color: svc.docs_path ? 'var(--accent)' : 'var(--text-muted)' }}>
                  文档: {svc.docs_path || '未配置'}
                </span>
              </div>
              {editing?.id === svc.id && (
                <div style={{ marginTop: 16, padding: '16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      本地仓库路径 — Claude Code 精诊读源码
                    </label>
                    <input value={repoPath} onChange={e => setRepoPath(e.target.value)}
                      placeholder="/path/to/repo" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      文档路径 — 业务知识库
                    </label>
                    <input value={docsPath} onChange={e => setDocsPath(e.target.value)}
                      placeholder="docs-site/dev/wall/" style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={saveConfig} style={{
                      padding: '6px 20px', background: 'var(--accent)', color: '#000',
                      border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
                      fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
                    }}>保存</button>
                    <button onClick={() => setEditing(null)} style={{
                      padding: '6px 20px', background: 'transparent', color: 'var(--text-muted)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                      cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)',
                    }}>取消</button>
                    {saved && <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>已保存</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
