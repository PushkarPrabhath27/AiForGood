// frontend/lib/api-client.ts
import { fetchAuthSession } from "aws-amplify/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...headers },
    next: { revalidate: 30 }, // 30s ISR for dashboard data
  });
  if (!res.ok) throw new Error(`API error ${res.status} on GET ${path}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message ?? "Unknown API error");
  return data.data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status} on POST ${path}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message ?? "Unknown API error");
  return data.data as T;
}
