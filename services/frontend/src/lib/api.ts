const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type DashboardType =
  | "dashboard"
  | "hn_zeitung"
  | "life"
  | "custom_url"
  | "weather"
  | "github"
  | "homeassistant"
  | "homeassistant_temp"
  | "image";

export type ImageAlgorithm = "floyd_steinberg" | "ordered" | "threshold" | "atkinson";
export type ImageFit = "contain" | "cover" | "stretch";

/** The user's current Image dashboard config (never the bytes). */
export interface ImageConfig {
  content_type: string;
  algorithm: ImageAlgorithm;
  fit: ImageFit;
  /** Contrast multiplier applied before dithering; 1.0 = unchanged, <1.0 softer. */
  contrast: number;
}

export interface GithubProfile {
  username: string;
}

/** The user's Home Assistant ingest channel: the webhook URL HA pushes to,
 * plus a ready-to-paste HA automation snippet. */
export interface HaConnection {
  ingest_token: string;
  webhook_url: string;
  sensor_webhook_url: string;
  automation_yaml: string;
  sensor_automation_yaml: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  place: string | null;
}

export type DashboardSource = "store" | "custom";

/** A built-in dashboard in the store catalog. */
export interface StoreItem {
  type: DashboardType;
  title: string;
  description: string;
}

/** One dashboard in the user's collection (store-added or custom). */
export interface Dashboard {
  id: string;
  source: DashboardSource;
  type: DashboardType | null;
  custom_url: string | null;
  name: string;
  description: string | null;
  slug: string;
  preview_url: string;
  created_at: string;
  updated_at: string;
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
  name: string;
  slug: string;
  dashboard_id: string | null;
  dashboard: Dashboard | null;
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

/** Request expecting no body (e.g. 204 responses). */
async function reqVoid(path: string, token: string, init?: RequestInit): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeader(token), ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await errorMessage(res));
}

export interface CustomDashboardInput {
  name: string;
  description?: string | null;
  slug?: string | null;
  custom_url: string;
}

export interface DashboardEdit {
  name?: string;
  description?: string | null;
  slug?: string;
  custom_url?: string;
}

export const api = {
  me: (token: string) => req<User>("/users/me", token),

  // --- store (built-in catalog) --- //
  listStore: (token: string) => req<StoreItem[]>("/store", token),
  getStoreItem: (token: string, type: DashboardType) =>
    req<StoreItem>(`/store/${type}`, token),

  // --- collection --- //
  listDashboards: (token: string, source?: DashboardSource) =>
    req<Dashboard[]>(`/dashboards${source ? `?source=${source}` : ""}`, token),
  addStoreDashboard: (token: string, type: DashboardType) =>
    req<Dashboard>("/dashboards/store", token, {
      method: "POST",
      body: JSON.stringify({ type }),
    }),
  createCustomDashboard: (token: string, body: CustomDashboardInput) =>
    req<Dashboard>("/dashboards/custom", token, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateDashboard: (token: string, id: string, body: DashboardEdit) =>
    req<Dashboard>(`/dashboards/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteDashboard: (token: string, id: string) =>
    reqVoid(`/dashboards/${id}`, token, { method: "DELETE" }),

  // --- epapers (one or more physical devices) --- //
  listEpapers: (token: string) => req<Epaper[]>("/epapers", token),
  createEpaper: (token: string, name: string) =>
    req<Epaper>("/epapers", token, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  renameEpaper: (token: string, id: string, name: string) =>
    req<Epaper>(`/epapers/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteEpaper: (token: string, id: string) =>
    reqVoid(`/epapers/${id}`, token, { method: "DELETE" }),
  setDashboard: (token: string, id: string, dashboard_id: string | null) =>
    req<Epaper>(`/epapers/${id}/dashboard`, token, {
      method: "PATCH",
      body: JSON.stringify({ dashboard_id }),
    }),
  setGeometry: (token: string, id: string, geometry: EpaperGeometry) =>
    req<Epaper>(`/epapers/${id}/geometry`, token, {
      method: "PATCH",
      body: JSON.stringify(geometry),
    }),
  setRefresh: (token: string, id: string, refresh: EpaperRefresh) =>
    req<Epaper>(`/epapers/${id}/refresh`, token, {
      method: "PATCH",
      body: JSON.stringify(refresh),
    }),

  /** Live example HTML preview for a built-in dashboard type, for the in-app
   * iframe. Serves canned data and does not change what the epaper serves. */
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

  // --- image --- //
  /** Fetch the user's Image dashboard config (404 if nothing uploaded). */
  getImage: (token: string) => req<ImageConfig>("/image", token),
  /** Upload (or replace) the source image. Sends multipart/form-data; the
   * browser sets the boundary Content-Type, so we don't send authHeader's. */
  uploadImage: async (token: string, file: File): Promise<ImageConfig> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/image`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) throw new Error(await errorMessage(res));
    return res.json() as Promise<ImageConfig>;
  },
  /** Change dithering algorithm / fit / contrast without re-uploading. */
  setImageSettings: (
    token: string,
    algorithm: ImageAlgorithm,
    fit: ImageFit,
    contrast: number,
  ) =>
    req<ImageConfig>("/image", token, {
      method: "PATCH",
      body: JSON.stringify({ algorithm, fit, contrast }),
    }),

  // --- home assistant --- //
  /** Fetch the existing HA connection (404 if not minted yet). */
  getHaConnection: (token: string) => req<HaConnection>("/ha/connection", token),
  /** Mint (or return the existing) HA connection for the current user. */
  createHaConnection: (token: string) =>
    req<HaConnection>("/ha/connection", token, { method: "POST" }),
};
