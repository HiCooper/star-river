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

export async function fetchIssues(params: Record<string, string>): Promise<IssueListResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/issues${buildQuery(params)}`);
  return res.json();
}

export async function fetchIssue(id: string): Promise<{ success: boolean; data: Issue }> {
  const res = await fetch(`${BASE_URL}/api/v1/issues/${id}`);
  return res.json();
}

export async function fetchStats(): Promise<{ success: boolean; data: OverviewStats }> {
  const res = await fetch(`${BASE_URL}/api/v1/stats/overview`);
  return res.json();
}

export async function approveIssue(id: string) {
  await fetch(`${BASE_URL}/api/v1/issues/${id}/approve`, { method: 'POST' });
}

export async function rejectIssue(id: string) {
  await fetch(`${BASE_URL}/api/v1/issues/${id}/reject`, { method: 'POST' });
}
