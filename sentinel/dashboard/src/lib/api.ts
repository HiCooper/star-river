const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082';

export interface Issue {
  id: string;
  service_name: string;
  title: string;
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
  fix_type: string;
  fix_pr_url: string;
  review_status: string;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface IssueListResponse {
  success: boolean;
  data: Issue[];
  pagination: Pagination;
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

async function safeFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'API request failed');
  }
  return json.data as T;
}

export async function fetchIssues(params: Record<string, string>): Promise<{ data: Issue[]; pagination: Pagination }> {
  const res = await fetch(`${BASE_URL}/api/v1/issues${buildQuery(params)}`);
  const json = await res.json();
  if (!json.success) {
    return { data: [], pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 } };
  }
  return { data: json.data, pagination: json.pagination };
}

export async function fetchIssue(id: string): Promise<Issue | null> {
  return safeFetch<Issue>(`${BASE_URL}/api/v1/issues/${id}`).catch(() => null);
}

export async function fetchStats(): Promise<OverviewStats | null> {
  return safeFetch<OverviewStats>(`${BASE_URL}/api/v1/stats/overview`).catch(() => null);
}

export async function approveIssue(id: string) {
  await fetch(`${BASE_URL}/api/v1/issues/${id}/approve`, { method: 'POST' });
}

export async function rejectIssue(id: string) {
  await fetch(`${BASE_URL}/api/v1/issues/${id}/reject`, { method: 'POST' });
}
