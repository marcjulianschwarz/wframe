"""GitHub renderer — a public profile card for the user's stored username.

Data comes from GitHub's public REST API (no auth required; an optional
GITHUB_TOKEN lifts the 60→5,000 req/hr rate limit). Only public data is read:
profile, public repos, and a language byte breakdown aggregated across them.
Drawn with the bundled Cozette pixel font at scale=1, like the weather and HN
dashboards, so the type stays crisp through the 1-bit threshold.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from html import escape
from pathlib import Path
from typing import ClassVar, cast

import httpx
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.bitmap_models import GithubProfile
from app.features.bitmap.renderers.base import html_to_bmp
from app.settings import settings

FONTS_DIR = Path(__file__).parent.parent / "fonts"

API = "https://api.github.com"
# Top repos shown, and languages in the breakdown bar.
TOP_REPOS = 5
TOP_LANGS = 5


class Repo(BaseModel):
    """The subset of a GitHub repo object the card uses."""

    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore")

    name: str = ""
    fork: bool = False
    language: str | None = None
    stargazers_count: int = 0
    forks_count: int = 0


class Profile(BaseModel):
    """The subset of a GitHub user object the card uses."""

    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore")

    login: str = ""
    name: str | None = None
    bio: str | None = None
    followers: int = 0
    public_repos: int = 0
    created_at: str = ""


class GithubData(BaseModel):
    profile: Profile
    repos: list[Repo]


class Aggregate(BaseModel):
    total_stars: int
    total_forks: int
    top: list[Repo]
    langs: dict[str, int]


def _font_face() -> str:
    reg = (FONTS_DIR / "Cozette.ttf").as_uri()
    bold = (FONTS_DIR / "CozetteBold.ttf").as_uri()
    return f'''
  @font-face {{ font-family:"Cozette"; font-weight:400;
    src:url("{reg}") format("truetype"); }}
  @font-face {{ font-family:"Cozette"; font-weight:700;
    src:url("{bold}") format("truetype"); }}'''


def _headers() -> dict[str, str]:
    h = {"Accept": "application/vnd.github+json", "User-Agent": "wframe"}
    if settings.GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
    return h


async def _fetch(username: str) -> GithubData:
    """Fetch the public profile, public repos, and an aggregated language
    breakdown for ``username``. Raises httpx.HTTPStatusError on a missing user
    so the service falls back to the last cached bitmap."""
    async with httpx.AsyncClient(timeout=15, headers=_headers()) as client:
        prof = await client.get(f"{API}/users/{username}")
        _ = prof.raise_for_status()
        profile = Profile.model_validate(prof.json())

        # Up to 100 most-recently-pushed public repos — plenty for stars and a
        # language breakdown without paginating the whole account.
        rr = await client.get(
            f"{API}/users/{username}/repos",
            params={"per_page": 100, "sort": "pushed", "type": "owner"},
        )
        _ = rr.raise_for_status()
        repos = [Repo.model_validate(r) for r in cast("list[object]", rr.json())]

    return GithubData(profile=profile, repos=repos)


def aggregate(repos: list[Repo]) -> Aggregate:
    """Roll repos up into the numbers the card shows."""
    own = [r for r in repos if not r.fork]
    total_stars = sum(r.stargazers_count for r in own)
    total_forks = sum(r.forks_count for r in own)

    top = sorted(own, key=lambda r: r.stargazers_count, reverse=True)
    top = [r for r in top if r.stargazers_count > 0][:TOP_REPOS] or own[:TOP_REPOS]

    # Language share by repo count (the per-repo primary language). Cheap and
    # avoids an extra API call per repo for byte-level stats.
    langs: dict[str, int] = {}
    for r in own:
        if r.language:
            langs[r.language] = langs.get(r.language, 0) + 1

    return Aggregate(
        total_stars=total_stars,
        total_forks=total_forks,
        top=top,
        langs=langs,
    )


def _fmt(n: int) -> str:
    """Compact integer: 1234 → 1.2k."""
    if n >= 1000:
        return f"{n / 1000:.1f}k".replace(".0k", "k")
    return str(n)


# Dither tiles, lightest→darkest. Each is an 8×8 pure black/white pattern, so it
# survives the 1-bit threshold as a real *texture* (not a grey that snaps to one
# tone) — that's what lets adjacent language segments read apart on epaper.
# Listed densest-distinct so neighbours never look alike: solid white, dense
# dots, diagonal hatch, sparse dots, fine checker.
_DITHERS = [
    # solid white
    '<rect width="8" height="8" fill="#fff"/>',
    # dense dots (white on black)
    '<rect width="8" height="8" fill="#000"/>'
    + '<rect x="1" y="1" width="2" height="2" fill="#fff"/>'
    + '<rect x="5" y="1" width="2" height="2" fill="#fff"/>'
    + '<rect x="1" y="5" width="2" height="2" fill="#fff"/>'
    + '<rect x="5" y="5" width="2" height="2" fill="#fff"/>',
    # diagonal hatch
    '<rect width="8" height="8" fill="#000"/>'
    + '<path d="M0 8 L8 0 M-2 2 L2 -2 M6 10 L10 6" stroke="#fff" stroke-width="2"/>',
    # sparse dots
    '<rect width="8" height="8" fill="#000"/><rect x="3" y="3" width="2" height="2" fill="#fff"/>',
    # fine checker
    '<rect width="8" height="8" fill="#000"/>'
    + '<rect x="0" y="0" width="4" height="4" fill="#fff"/>'
    + '<rect x="4" y="4" width="4" height="4" fill="#fff"/>',
]


def _lang_bar(langs: dict[str, int]) -> str:
    """Top languages as a single horizontal proportion bar plus a legend,
    inline SVG at the same 380px native content width the weather chart uses.
    Each segment is filled with a distinct dither tile so the shades stay
    distinguishable through the 1-bit threshold."""
    if not langs:
        return '<div class="cap">No language data</div>'

    items = sorted(langs.items(), key=lambda kv: kv[1], reverse=True)[:TOP_LANGS]
    total = sum(v for _, v in items) or 1
    w, bar_h = 380, 30

    # One <pattern> per used dither tile, referenced by both bar and legend swatch.
    defs = "".join(
        f'<pattern id="dz{i}" width="8" height="8" patternUnits="userSpaceOnUse" '
        + f'shape-rendering="crispEdges">{tile}</pattern>'
        for i, tile in enumerate(_DITHERS[: len(items)])
    )

    segs: list[str] = []
    seps: list[str] = []  # 1px black gaps so neighbouring textures don't merge
    x = 0.0
    for i, (_, v) in enumerate(items):
        seg_w = w * v / total
        segs.append(f'<rect x="{x:.1f}" y="0" width="{seg_w:.1f}" height="{bar_h}" fill="url(#dz{i})"/>')
        if i > 0:
            seps.append(f'<rect x="{x:.1f}" y="0" width="1.5" height="{bar_h}" fill="#000"/>')
        x += seg_w
    bar = (
        f'<svg width="{w}" height="{bar_h}" viewBox="0 0 {w} {bar_h}" '
        f'xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
        f"<defs>{defs}</defs>"
        f'<rect x="0" y="0" width="{w}" height="{bar_h}" fill="#000" '
        f'stroke="#fff" stroke-width="1"/>'
        f"{''.join(segs)}{''.join(seps)}"
        # redraw the white frame on top so segment fills don't cover it
        f'<rect x="0" y="0" width="{w}" height="{bar_h}" fill="none" '
        f'stroke="#fff" stroke-width="2"/></svg>'
    )

    # Legend swatches reuse the same dither tiles as tiny inline SVGs.
    legend: list[str] = []
    for i, (name, v) in enumerate(items):
        pct = round(100 * v / total)
        sw = (
            f'<svg class="sw" width="16" height="16" viewBox="0 0 8 8" '
            f'shape-rendering="crispEdges">{_DITHERS[i]}'
            f'<rect x="0" y="0" width="8" height="8" fill="none" '
            f'stroke="#fff" stroke-width="0.5"/></svg>'
        )
        legend.append(f'<div class="leg">{sw}{escape(name)} {pct}%</div>')
    return f'<div class="bar">{bar}</div><div class="legend">{"".join(legend)}</div>'


def render_html(profile: Profile, agg: Aggregate) -> str:
    name = escape(profile.name or profile.login or "—")
    login = escape(profile.login or "")
    bio = escape((profile.bio or "").strip())
    followers = profile.followers
    public_repos = profile.public_repos
    joined = profile.created_at[:4]

    rows: list[str] = []
    for r in agg.top:
        stars = r.stargazers_count
        # Star glyph sits to the right of the count.
        rows.append(
            f'<div class="repo"><span class="rn">{escape(r.name)}</span>'
            + f'<span class="rs">{_fmt(stars)} &#9733;</span></div>'
        )
    repo_rows = "".join(rows) or '<div class="repo">No public repos</div>'

    stamp = datetime.now().strftime("%a %d %b · %H:%M")

    return f"""\
<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=480, initial-scale=1.0">
<style>{_font_face()}
  *{{box-sizing:border-box;margin:0;padding:0;}}
  html,body{{width:480px;height:800px;background:#000;color:#fff;
    font-family:"Cozette",monospace;-webkit-font-smoothing:none;
    font-smooth:never;text-rendering:geometricPrecision;}}
  body{{padding:26px;}}
  .frame{{border:2px solid #fff;padding:24px 22px;height:100%;
    display:flex;flex-direction:column;}}
  .head{{text-align:center;border-bottom:2px solid #fff;
    padding-bottom:14px;margin-bottom:16px;}}
  .head .name{{font-size:34px;font-weight:700;line-height:1.05;}}
  .head .login{{font-size:15px;margin-top:4px;}}
  .head .bio{{font-size:13px;line-height:1.5;margin-top:10px;}}
  .stats{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;
    text-align:center;border-bottom:2px solid #fff;padding-bottom:16px;
    margin-bottom:16px;}}
  .stat .v{{font-size:26px;font-weight:700;}}
  .stat .k{{font-size:12px;text-transform:uppercase;margin-top:2px;}}
  .cap{{font-size:13px;font-weight:700;text-transform:uppercase;
    margin-bottom:10px;}}
  .repos{{flex:1;}}
  .repo{{display:flex;justify-content:space-between;font-size:15px;
    padding:5px 0;border-bottom:1px solid #fff;}}
  .repo .rs{{font-weight:700;white-space:nowrap;padding-left:12px;}}
  .langs{{margin-top:16px;}}
  .bar svg{{display:block;width:380px;height:26px;}}
  .legend{{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;
    font-size:13px;}}
  .leg{{display:flex;align-items:center;}}
  .sw{{display:inline-block;width:11px;height:11px;margin-right:5px;
    border:1px solid #fff;}}
  .footer{{margin-top:16px;padding-top:13px;border-top:2px solid #fff;
    display:flex;justify-content:space-between;font-size:13px;font-weight:700;
    text-transform:uppercase;}}
</style></head><body>
  <div class="frame">
    <div class="head">
      <div class="name">{name}</div>
      <div class="login">@{login} · since {joined}</div>
      {f'<div class="bio">{bio}</div>' if bio else ""}
    </div>
    <div class="stats">
      <div class="stat"><div class="v">{_fmt(agg.total_stars)}</div>
        <div class="k">Stars</div></div>
      <div class="stat"><div class="v">{_fmt(followers)}</div>
        <div class="k">Followers</div></div>
      <div class="stat"><div class="v">{_fmt(public_repos)}</div>
        <div class="k">Repos</div></div>
    </div>
    <div class="repos">
      <div class="cap">Top repositories</div>
      {repo_rows}
    </div>
    <div class="langs">
      <div class="cap">Languages</div>
      {_lang_bar(agg.langs)}
    </div>
    <div class="footer">
      <span>GitHub</span><span>{escape(stamp)}</span>
    </div>
  </div>
</body></html>"""


def _no_username_html() -> str:
    return f"""\
<!doctype html><html><head><meta charset="utf-8"><style>{_font_face()}
  html,body{{margin:0;width:480px;height:800px;background:#000;color:#fff;
    font-family:"Cozette",monospace;-webkit-font-smoothing:none;}}
  body{{display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;padding:40px;}}
  h1{{font-size:39px;font-weight:700;text-transform:uppercase;margin:0 0 20px;}}
  p{{font-size:13px;line-height:1.6;}}
</style></head><body>
  <h1>GitHub</h1>
  <p>No username set yet.<br><br>Open wframe in your browser and<br>
     enter a GitHub username to enable<br>this dashboard.</p>
</body></html>"""


class GithubRenderer:
    def __init__(self, session: AsyncSession, user_id: uuid.UUID) -> None:
        self.session: AsyncSession = session
        self.user_id: uuid.UUID = user_id

    async def render(self) -> bytes:
        profile = await self.session.get(GithubProfile, self.user_id)
        if profile is None:
            return await html_to_bmp(_no_username_html(), scale=1)
        data = await _fetch(profile.username)
        agg = aggregate(data.repos)
        html = render_html(data.profile, agg)
        return await html_to_bmp(html, scale=1)
