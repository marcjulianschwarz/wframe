import enum


class DashboardType(str, enum.Enum):
    DASHBOARD = "dashboard"
    HN_ZEITUNG = "hn_zeitung"
    LIFE = "life"
    CUSTOM_URL = "custom_url"
    WEATHER = "weather"
    GITHUB = "github"


DASHBOARD_CATALOG: dict[DashboardType, dict[str, str]] = {
    DashboardType.DASHBOARD: {
        "title": "Dashboard",
        "description": "Weather, calendar, stats, and a daily quote.",
    },
    DashboardType.HN_ZEITUNG: {
        "title": "HN Zeitung",
        "description": "Newspaper-style top Hacker News stories with AI summaries.",
    },
    DashboardType.LIFE: {
        "title": "Life",
        "description": "Conway's Game of Life — evolving cellular automaton.",
    },
    DashboardType.CUSTOM_URL: {
        "title": "Custom URL",
        "description": "Render any web page you point it at, as a bitmap.",
    },
    DashboardType.WEATHER: {
        "title": "Weather",
        "description": "Live 24h temperature chart and stats for your location.",
    },
    DashboardType.GITHUB: {
        "title": "GitHub",
        "description": "A public profile card: stars, top repos, and languages.",
    },
}
