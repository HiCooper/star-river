const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082';

export interface Service {
  id: string;
  name: string;
  display_name: string;
  repo_url: string;
  repo_branch: string;
  owner_team: string;
  status: string;
  repo_local_path: string;
  docs_path: string;
}

export interface Issue {
  id: string;
  service_name: string;
  signature_id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  ai_category: string;
  ai_severity: string;
  ai_auto_fixable: string;
  ai_confidence: number;
  ai_fix_suggestion: string;
  ai_suspected_file: string;
  ai_suspected_line: number;
  deep_diagnosis: any;
  fix_log: any;
  fix_type: string;
  fix_pr_url: string;
  fix_status: string;
  review_status: string;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
}

export interface OverviewStats {
  total_issues: number;
  open_issues: number;
  resolved_issues: number;
  critical_issues: number;
  high_issues: number;
  auto_fixed: number;
}

function buildQuery(params: Record<string, string>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchServices(): Promise<Service[]> {
  const res = await fetch(`${BASE_URL}/api/v1/services`);
  const json = await res.json();
  return json.success ? json.data : [];
}

export async function fetchIssues(params: Record<string, string>): Promise<{ data: Issue[]; pagination: any }> {
  const res = await fetch(`${BASE_URL}/api/v1/issues${buildQuery(params)}`);
  const json = await res.json();
  if (!json.success) return { data: [], pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 } };
  return { data: json.data, pagination: json.pagination };
}

export async function fetchIssue(id: string): Promise<Issue | null> {
  const res = await fetch(`${BASE_URL}/api/v1/issues/${id}`);
  const json = await res.json();
  return json.success ? json.data : null;
}

export async function fetchStats(): Promise<OverviewStats | null> {
  const res = await fetch(`${BASE_URL}/api/v1/stats/overview`);
  const json = await res.json();
  return json.success ? json.data : null;
}

export async function approveIssue(id: string) {
  await fetch(`${BASE_URL}/api/v1/issues/${id}/approve`, { method: 'POST' });
}

export async function rejectIssue(id: string) {
  await fetch(`${BASE_URL}/api/v1/issues/${id}/reject`, { method: 'POST' });
}
