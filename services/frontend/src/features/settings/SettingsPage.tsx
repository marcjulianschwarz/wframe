import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LANGUAGES, LANGUAGE_LABELS, useI18n } from "@/lib/i18n";

/** App settings (/settings). Currently just the UI language, stored per-browser
 * in localStorage; the switch applies immediately across the app. */
export function SettingsPage() {
  const { t, lang, setLang } = useI18n();

  return (
    <div className="min-h-screen px-6 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/" className="icon-btn" aria-label={t("settings.backToDevices")}>
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold m-0">{t("settings.title")}</h1>
      </div>

      <div className="sketch p-4 flex flex-col gap-3" style={{ borderRadius: 16 }}>
        <div className="field-label uppercase tracking-wider">{t("settings.language")}</div>
        <div className="flex gap-2 flex-wrap">
          {LANGUAGES.map((code) => (
            <button
              key={code}
              className={code === lang ? "btn btn-accent" : "btn"}
              aria-pressed={code === lang}
              onClick={() => setLang(code)}
            >
              {LANGUAGE_LABELS[code]}
            </button>
          ))}
        </div>
        <p className="text-sm text-soft m-0">{t("settings.languageHint")}</p>
      </div>
    </div>
  );
}
