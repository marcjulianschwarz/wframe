import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type Dashboard,
  type Epaper,
  type EpaperGeometry,
  type EpaperRefresh,
  type User,
} from "@/lib/api";
import { useSession } from "@/lib/session";

// Query keys — one place so cache reads/writes stay in sync.
export const qk = {
  user: ["user"] as const,
  epapers: ["epapers"] as const,
  dashboards: ["dashboards"] as const,
  preview: (id: string, sig: string) => ["preview", id, sig] as const,
};

/** The signed-in user. */
export function useUser(): User | undefined {
  const { token } = useSession();
  return useQuery({ queryKey: qk.user, queryFn: () => api.me(token) }).data;
}

/** Every epaper device the user owns. Returns [] until loaded so callers don't
 * need to guard undefined. */
export function useEpapers(): Epaper[] {
  const { token } = useSession();
  return useQuery({ queryKey: qk.epapers, queryFn: () => api.listEpapers(token) }).data ?? [];
}

/** The user's dashboards. */
export function useDashboardList(): Dashboard[] {
  const { token } = useSession();
  return useQuery({ queryKey: qk.dashboards, queryFn: () => api.listDashboards(token) }).data ?? [];
}

/** Shared shape for dashboard reads + the mutations that keep the cache fresh. */
export interface DashboardsStore {
  dashboards: Dashboard[];
  /** Epapers currently showing a given dashboard. */
  liveOn: (d: Dashboard) => Epaper[];
  add: (d: Dashboard) => void;
  update: (d: Dashboard) => void;
  remove: (id: string) => void;
}

/** Dashboards plus cache-updating helpers, so create/edit/delete reflect
 * instantly without a refetch. */
export function useDashboards(): DashboardsStore {
  const qc = useQueryClient();
  const dashboards = useDashboardList();
  const epapers = useEpapers();
  const set = (fn: (prev: Dashboard[]) => Dashboard[]) =>
    qc.setQueryData<Dashboard[]>(qk.dashboards, (prev) => fn(prev ?? []));
  return {
    dashboards,
    liveOn: (d) => epapers.filter((e) => e.dashboard_id === d.id),
    add: (d) => set((prev) => [...prev, d]),
    update: (d) => set((prev) => prev.map((x) => (x.id === d.id ? d : x))),
    remove: (id) => set((prev) => prev.filter((x) => x.id !== id)),
  };
}

/** Insert-or-replace a single epaper in the cached list. */
export function useUpsertEpaper(): (e: Epaper) => void {
  const qc = useQueryClient();
  return (e) =>
    qc.setQueryData<Epaper[]>(qk.epapers, (prev) => {
      const list = prev ?? [];
      return list.some((x) => x.id === e.id)
        ? list.map((x) => (x.id === e.id ? e : x))
        : [...list, e];
    });
}

/** Remove an epaper from the cached list (after delete). */
export function useRemoveEpaper(): (id: string) => void {
  const qc = useQueryClient();
  return (id) =>
    qc.setQueryData<Epaper[]>(qk.epapers, (prev) => (prev ?? []).filter((x) => x.id !== id));
}

/** All the epaper actions as one mutation surface. Each resolves to the updated
 * epaper and writes it straight into the cache, so every view (home, device page)
 * updates at once. `notify` messages are the caller's job — these just run + cache. */
export function useEpaperActions() {
  const { token } = useSession();
  const upsert = useUpsertEpaper();

  const rename = useMutation({
    mutationFn: (v: { id: string; name: string }) => api.renameEpaper(token, v.id, v.name),
    onSuccess: upsert,
  });
  const setDashboard = useMutation({
    mutationFn: (v: { id: string; dashboardId: string | null }) =>
      api.setDashboard(token, v.id, v.dashboardId),
    onSuccess: upsert,
  });
  const setGeometry = useMutation({
    mutationFn: (v: { id: string; geometry: EpaperGeometry }) =>
      api.setGeometry(token, v.id, v.geometry),
    onSuccess: upsert,
  });
  const setRefresh = useMutation({
    mutationFn: (v: { id: string; refresh: EpaperRefresh }) =>
      api.setRefresh(token, v.id, v.refresh),
    onSuccess: upsert,
  });
  const refreshNow = useMutation({
    mutationFn: (id: string) => api.refreshNow(token, id),
    onSuccess: upsert,
  });
  const create = useMutation({
    mutationFn: (name: string) => api.createEpaper(token, name),
    onSuccess: upsert,
  });

  return { rename, setDashboard, setGeometry, setRefresh, refreshNow, create };
}
