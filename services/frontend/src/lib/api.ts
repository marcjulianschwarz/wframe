const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type DashboardType =
  | "dashboard"
  | "hn_zeitung"
  | "life"
  | "custom_url"
  | "weather"
  | "github";

export interface GithubProfile {
  username: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  place: string | null;
}

export interface DashboardOption {
  type: DashboardType;
  title: string;
  description: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
}

export type Rotation = 0 | 90 | 180 | 270;

export interface EpaperGeometry {
  screen_width: number;
  screen_height: number;
  image_width: number;
  image_height: number;
  image_x: number;
  image_y: number;
  rotation: Rotation;
}

export interface EpaperRefresh {
  paused: boolean;
  refresh_interval: number;
}

export interface Epaper extends EpaperGeometry, EpaperRefresh {
  id: string;
  user_id: string;
  slug: string;
  dashboard_type: DashboardType;
  custom_url: string | null;
  bitmap_url: string;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/** Pull a human-readable message out of a FastAPI error body. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail) && body.detail[0]?.msg) {
      return body.detail[0].msg;
    }
  } catch {
    // not JSON
  }
  return `Request failed (${res.status})`;
}

async function req<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeader(token), ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json() as Promise<T>;
}

/** Unauthenticated POST (register/login). */
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json() as Promise<T>;
}

export const authApi = {
  register: (email: string, password: string) =>
    post<TokenResponse>("/auth/register", { email, password }),
  login: (email: string, password: string) =>
    post<TokenResponse>("/auth/login", { email, password }),
};

export const api = {
  me: (token: string) => req<User>("/users/me", token),
  listDashboards: (token: string) => req<DashboardOption[]>("/dashboards", token),
  getEpaper: (token: string) => req<Epaper>("/epaper", token),
  setDashboard: (
    token: string,
    dashboard_type: DashboardType,
    custom_url?: string | null,
  ) =>
    req<Epaper>("/epaper", token, {
      method: "PATCH",
      body: JSON.stringify({ dashboard_type, custom_url: custom_url ?? null }),
    }),
  setGeometry: (token: string, geometry: EpaperGeometry) =>
    req<Epaper>("/epaper/geometry", token, {
      method: "PATCH",
      body: JSON.stringify(geometry),
    }),
  setRefresh: (token: string, refresh: EpaperRefresh) =>
    req<Epaper>("/epaper/refresh", token, {
      method: "PATCH",
      body: JSON.stringify(refresh),
    }),

  /** URL of the live example HTML for a dashboard, for the in-app iframe
   * preview. Serves canned data and does not change what the epaper serves. */
  previewUrl: (dashboard_type: DashboardType): string =>
    `${BASE}/bitmaps/${dashboard_type}/preview`,

  getLocation: (token: string) => req<Location>("/location", token),
  setLocation: (token: string, latitude: number, longitude: number, place?: string) =>
    req<Location>("/location", token, {
      method: "PUT",
      body: JSON.stringify({ latitude, longitude, place: place ?? null }),
    }),

  getGithub: (token: string) => req<GithubProfile>("/github", token),
  setGithub: (token: string, username: string) =>
    req<GithubProfile>("/github", token, {
      method: "PUT",
      body: JSON.stringify({ username }),
    }),
};
