import { authClient } from "@/lib/auth-client";

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

export function apiKeyFetch(path: string, apiKey: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  return fetch(`${apiURL}${path}`, { ...init, headers });
}
