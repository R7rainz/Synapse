import { authClient } from "@/lib/auth-client";
import type { GatewayUsage } from "@/lib/types";

export const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1234";

export async function apiFetch(path: string, init?: RequestInit) {
  const { data, error } = await authClient.token();
  if (error || !data?.token) {
    throw new Error("Could not create an API token");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${data.token}`);

  return fetch(`${apiURL}${path}`, { ...init, headers });
}

export async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed with ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function fetchGatewayUsage(): Promise<GatewayUsage> {
  return readResponse<GatewayUsage>(await apiFetch("/gateway/usage"));
}
