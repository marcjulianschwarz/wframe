import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { api, type Dashboard, type DashboardType } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useT } from "@/lib/i18n";
import { useDashboards } from "@/lib/queries";
import { DashboardConfig } from "./DashboardConfig";

/** Which built-in types have free-text config the view page stages behind Save.
 * Everything else (image upload, geolocation, Home Assistant) keeps its own
 * immediate-save config, rendered read-through below. */
const STAGED_TYPES: DashboardType[] = ["welcome", "calendar", "github", "vag"];

/** The full-page view editor (/views/:id): a live preview on the left and staged
 * configuration on the right. Edits are held locally; nothing is persisted until
 * Save. Replaces the old edit modal. */
export function ViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const dash = useDashboards();
  const view = dash.dashboards.find((d) => d.id === id) ?? null;

  if (!view) {
    return (
      <div className="min-h-screen px-6 py-6 flex flex-col items-center gap-4">
        <p className="text-soft text-lg">{t("viewPage.notExist")}</p>
        <Link to="/dashboards" className="btn">
          <ArrowLeft size={16} /> {t("viewPage.backToViews")}
        </Link>
      </div>
    );
  }

  return <ViewEditor key={view.id} view={view} onDone={() => navigate("/dashboards")} />;
}

/** Keyed by view id so staged state resets when navigating between views. */
function ViewEditor({ view, onDone }: { view: Dashboard; onDone: () => void }) {
  const { token, notify } = useSession();
  const t = useT();
  const dash = useDashboards();

  const isCustom = view.source === "custom";
  const staged = view.type !== null && STAGED_TYPES.includes(view.type);

  // --- staged local state (committed only on Save) --- //
  const [name, setName] = useState(view.name);
  const [url, setUrl] = useState(view.custom_url ?? "");
  const [welcomeEyebrow, setWelcomeEyebrow] = useState("");
  const [welcomeHeading, setWelcomeHeading] = useState("");
  const [welcomeBody, setWelcomeBody] = useState("");
  const [welcomeFooter, setWelcomeFooter] = useState("");
  const [calendarUrl, setCalendarUrl] = useState("");
  const [github, setGithub] = useState("");
  const [busy, setBusy] = useState(false);

  // Load current type-specific config into the staged fields once.
  useEffect(() => {
    if (view.type === "welcome") {
      api
        .getWelcome(token)
        .then((w) => {
          setWelcomeEyebrow(w.eyebrow);
          setWelcomeHeading(w.heading);
          setWelcomeBody(w.body);
          setWelcomeFooter(w.footer);
        })
        .catch(() => {});
    } else if (view.type === "calendar") {
      api
        .getCalendar(token)
        .then((c) => setCalendarUrl(c.ics_url))
        .catch(() => {});
    } else if (view.type === "github") {
      api
        .getGithub(token)
        .then((g) => setGithub(g.username))
        .catch(() => {});
    }
  }, [token, view.type]);

  const urlValid = !isCustom || /^https?:\/\/.+/i.test(url.trim());
  const canSave = name.trim().length > 0 && urlValid && !busy;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    try {
      // 1) The view's own name / custom URL.
      const updated = await api.updateDashboard(token, view.id, {
        name: name.trim(),
        ...(isCustom ? { custom_url: url.trim() } : {}),
      });
      // 2) Type-specific config, committed only now.
      if (view.type === "welcome") {
        await api.setWelcome(token, {
          eyebrow: welcomeEyebrow.trim(),
          heading: welcomeHeading.trim() || "Welcome",
          body: welcomeBody,
          footer: welcomeFooter.trim(),
        });
      } else if (view.type === "calendar" && calendarUrl.trim()) {
        await api.setCalendar(token, calendarUrl.trim());
      } else if (view.type === "github" && github.trim()) {
        await api.setGithub(token, github.trim());
      }
      dash.update(updated);
      notify("success", t("viewPage.saved", { name: updated.name }));
      onDone();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(t("viewPage.deleteConfirm", { name: view.name }))) return;
    setBusy(true);
    try {
      await api.deleteDashboard(token, view.id);
      dash.remove(view.id);
      notify("success", t("viewPage.deleted", { name: view.name }));
      onDone();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link to="/dashboards" className="icon-btn" aria-label={t("viewPage.backToViews")}>
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold m-0 truncate">{name || view.name}</h1>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn btn-danger" disabled={busy} onClick={() => void remove()}>
            <Trash2 size={16} />
            {t("action.delete")}
          </button>
          <button className="btn btn-accent" disabled={!canSave} onClick={() => void save()}>
            {busy ? t("action.saving") : t("action.save")}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* Left: live preview */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <h2 className="field-label uppercase tracking-wider self-start">
            {t("viewPage.preview")}
          </h2>
          <ViewPreview
            view={view}
            welcomeEyebrow={welcomeEyebrow}
            welcomeHeading={welcomeHeading}
            welcomeBody={welcomeBody}
            welcomeFooter={welcomeFooter}
            customUrl={isCustom ? url : null}
          />
        </div>

        {/* Right: configuration */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <h2 className="field-label uppercase tracking-wider">{t("viewPage.configuration")}</h2>

          <label className="flex flex-col gap-1">
            <span className="field-label">{t("viewEdit.name")}</span>
            <input
              className="field"
              value={name}
              maxLength={80}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          {isCustom && (
            <label className="flex flex-col gap-1">
              <span className="field-label">{t("viewEdit.url")}</span>
              <input
                className="field"
                type="url"
                value={url}
                disabled={busy}
                placeholder="https://example.com/my-page"
                onChange={(e) => setUrl(e.target.value)}
              />
              {url.length > 0 && !urlValid && (
                <span className="text-sm" style={{ color: "var(--danger)" }}>
                  {t("custom.urlInvalid")}
                </span>
              )}
            </label>
          )}

          {/* Staged type-specific config (committed on Save). */}
          {view.type === "welcome" && (
            <>
              <label className="flex flex-col gap-1">
                <span className="field-label">{t("viewPage.welcomeEyebrow")}</span>
                <input
                  className="field"
                  value={welcomeEyebrow}
                  maxLength={120}
                  disabled={busy}
                  onChange={(e) => setWelcomeEyebrow(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="field-label">{t("viewPage.welcomeHeading")}</span>
                <input
                  className="field"
                  value={welcomeHeading}
                  maxLength={120}
                  disabled={busy}
                  placeholder="Welcome"
                  onChange={(e) => setWelcomeHeading(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="field-label">{t("viewPage.welcomeBody")}</span>
                <textarea
                  className="field"
                  rows={6}
                  value={welcomeBody}
                  maxLength={1000}
                  disabled={busy}
                  onChange={(e) => setWelcomeBody(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="field-label">{t("viewPage.welcomeFooter")}</span>
                <input
                  className="field"
                  value={welcomeFooter}
                  maxLength={120}
                  disabled={busy}
                  onChange={(e) => setWelcomeFooter(e.target.value)}
                />
              </label>
            </>
          )}

          {view.type === "calendar" && (
            <label className="flex flex-col gap-1">
              <span className="field-label">{t("viewPage.calendarUrl")}</span>
              <input
                className="field"
                type="url"
                value={calendarUrl}
                disabled={busy}
                placeholder="webcal://…  or  https://…/calendar.ics"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setCalendarUrl(e.target.value)}
              />
              <span className="text-sm text-soft">{t("viewPage.calendarHint")}</span>
            </label>
          )}

          {view.type === "github" && (
            <label className="flex flex-col gap-1">
              <span className="field-label">{t("viewPage.githubUsername")}</span>
              <input
                className="field"
                value={github}
                disabled={busy}
                placeholder="octocat"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setGithub(e.target.value)}
              />
            </label>
          )}

          {staged && <p className="text-sm text-soft m-0">{t("viewPage.unsavedHint")}</p>}

          {/* Complex configs keep their own immediate-save controls. */}
          {view.type !== null && !staged && (
            <>
              <DashboardConfig type={view.type} />
              <p className="text-sm text-soft m-0">{t("viewPage.configImmediateNote")}</p>
            </>
          )}
          {/* VGN stop search is interactive (immediate) even though it's "staged". */}
          {view.type === "vag" && <DashboardConfig type="vag" />}
        </div>
      </div>
    </div>
  );
}

const NATIVE_W = 480;
const NATIVE_H = 800;

/** Scaled iframe preview. For text-configurable types it points at the draft
 * preview endpoint so it reflects unsaved edits; for custom URLs it renders the
 * live page; otherwise it shows the type's canned preview. */
function ViewPreview({
  view,
  welcomeEyebrow,
  welcomeHeading,
  welcomeBody,
  welcomeFooter,
  customUrl,
}: {
  view: Dashboard;
  welcomeEyebrow: string;
  welcomeHeading: string;
  welcomeBody: string;
  welcomeFooter: string;
  customUrl: string | null;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / NATIVE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Debounce the draft so we don't reload the iframe on every keystroke.
  const [debounced, setDebounced] = useState({
    welcomeEyebrow,
    welcomeHeading,
    welcomeBody,
    welcomeFooter,
  });
  useEffect(() => {
    const h = window.setTimeout(
      () => setDebounced({ welcomeEyebrow, welcomeHeading, welcomeBody, welcomeFooter }),
      350,
    );
    return () => window.clearTimeout(h);
  }, [welcomeEyebrow, welcomeHeading, welcomeBody, welcomeFooter]);

  const src = useMemo(() => {
    if (customUrl && /^https?:\/\/.+/i.test(customUrl.trim())) return customUrl.trim();
    if (view.type === "welcome") {
      return api.draftPreviewUrl("welcome", {
        welcome_eyebrow: debounced.welcomeEyebrow,
        welcome_heading: debounced.welcomeHeading,
        welcome_body: debounced.welcomeBody,
        welcome_footer: debounced.welcomeFooter,
      });
    }
    if (view.type) return api.draftPreviewUrl(view.type);
    return null;
  }, [customUrl, view.type, debounced]);

  return (
    <div
      className="sketch overflow-hidden bg-black"
      style={{ width: 300, borderRadius: 18 }}
    >
      <div
        ref={frameRef}
        className="relative overflow-hidden bg-black w-full"
        style={{ aspectRatio: `${NATIVE_W} / ${NATIVE_H}` }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: NATIVE_W, height: NATIVE_H, transform: `scale(${scale})` }}
        >
          {src && (
            <iframe
              title={`${view.name} preview`}
              src={src}
              width={NATIVE_W}
              height={NATIVE_H}
              className="border-0"
              style={{ pointerEvents: "none" }}
              sandbox="allow-scripts"
              scrolling="no"
            />
          )}
        </div>
      </div>
    </div>
  );
}
