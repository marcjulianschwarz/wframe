"""HN Zeitung renderer — verbatim port of hn_zeitung.py."""

from __future__ import annotations

import asyncio
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from html import escape
from http.client import HTTPResponse
from pathlib import Path
from typing import ClassVar, cast

from openai import OpenAI
from pydantic import BaseModel, ConfigDict

from app.features.bitmap.renderers.base import NATIVE_SIZE, SCALE, Size, html_to_bmp
from app.settings import settings

CACHE = Path(__file__).parent.parent / ".hn_cache.json"
TOP_N = 4
MODEL = "gpt-5-nano"


class Story(BaseModel):
    """The subset of a Hacker News item the front page uses."""

    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore")

    title: str = ""
    url: str = ""
    by: str = ""
    score: int = 0
    descendants: int = 0


class Item(BaseModel):
    """A processed, summarized story — what gets cached and rendered."""

    id: int
    title: str = ""
    url: str = ""
    by: str = ""
    score: int = 0
    descendants: int = 0
    summary: str = ""


def get_client() -> OpenAI:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not configured")
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def fetch_json(url: str, timeout: int = 10) -> object:
    with cast("HTTPResponse", urllib.request.urlopen(url, timeout=timeout)) as r:
        return cast("object", json.loads(r.read()))


def fetch_top_story_ids() -> list[int]:
    ids = cast("list[int]", fetch_json("https://hacker-news.firebaseio.com/v0/topstories.json"))
    return ids[:TOP_N]


def fetch_story(sid: int) -> Story | None:
    raw = fetch_json(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json")
    if not raw:
        return None
    return Story.model_validate(raw)


def fetch_article_text(url: str) -> str:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 wframe"})
        with cast("HTTPResponse", urllib.request.urlopen(req, timeout=10)) as r:
            return r.read(200_000).decode("utf-8", errors="ignore")
    except Exception:
        return ""


def summarize(client: OpenAI, story: Story, body: str) -> str:
    title = story.title
    url = story.url
    raw = body[:30000]
    prompt = (
        "You are writing for a printed newspaper-style epaper. "
        "Summarize the article in 2-3 short sentences, max 45 words total. "
        "Plain prose only — no markdown, no bullets, no headlines. "
        "If article text is missing, infer from title and URL."
    )
    user = f"Title: {title}\nURL: {url}\n\nArticle:\n{raw}"
    try:
        resp = client.responses.create(model=MODEL, instructions=prompt, input=user)
        return resp.output_text.strip()
    except Exception as e:
        return f"(summary unavailable: {e})"


def load_cache() -> dict[str, Item]:
    if CACHE.exists():
        try:
            raw = cast("dict[str, object]", json.loads(CACHE.read_text()))
            return {k: Item.model_validate(v) for k, v in raw.items()}
        except Exception:
            return {}
    return {}


def save_cache(c: dict[str, Item]) -> None:
    _ = CACHE.write_text(json.dumps({k: v.model_dump() for k, v in c.items()}))


def process_story(client: OpenAI, sid: int, cache: dict[str, Item]) -> Item | None:
    try:
        story = fetch_story(sid)
        if not story:
            return None
        key = str(sid)
        if key in cache and cache[key].title == story.title:
            return cache[key]
        url = story.url
        body = fetch_article_text(url) if url else ""
        summary = summarize(client, story, body)
        item = Item(
            id=sid,
            title=story.title,
            url=url,
            by=story.by,
            score=story.score,
            descendants=story.descendants,
            summary=summary,
        )
        cache[key] = item
        return item
    except Exception as e:
        print(f"story {sid} fail: {e}")
        return None


def render_html(items: list[Item]) -> str:
    now = datetime.now().strftime("%a %d %b %Y · %H:%M")
    parts = [
        """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=480, initial-scale=1.0">
<title>Hacker News Zeitung</title>
<style>""",
        """
  * { box-sizing: border-box; margin: 0; padding: 0; }
  /* Fill the actual render viewport instead of a fixed 480×800, so the layout
     reflows when the device geometry changes. min-height keeps it growing if the
     stories overflow a short panel. */
  html, body {
    width: 100vw; min-height: 100vh;
    background: #fff; color: #000;
    font-family: sans-serif;
  }
  /* Flex column so the frame stretches to the full viewport height and its
     border reaches the bottom edge on any panel size. */
  body { padding: 26px; min-height: 100vh; display: flex; }
  .frame { border: 2px solid #000; padding: 24px 22px; flex: 1;
    display: flex; flex-direction: column; }
  .masthead {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 13px;
    margin-bottom: 18px;
  }
  .masthead .top {
    font-size: 13px; font-weight: 700;
    text-transform: uppercase;
  }
  .masthead h1 {
    font-size: 39px; font-weight: 700;
    line-height: 1; margin: 6px 0 7px;
    text-transform: uppercase;
  }
  .masthead .sub {
    font-size: 13px; font-weight: 700;
    text-transform: uppercase;
  }
  .stories {
    flex: 1;
    display: flex;
    flex-direction: column;
    row-gap: 13px;
  }
  article {
    padding: 0 0 13px;
    display: flex;
    flex-direction: column;
    border-bottom: 2px solid #000;
  }
  article:last-child { border-bottom: none; padding-bottom: 0; }
  article .num {
    font-size: 13px; font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  article h2 {
    font-size: 26px; font-weight: 700;
    line-height: 1.0;
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  article .meta {
    font-size: 13px; font-weight: 400;
    margin-bottom: 7px;
    text-transform: uppercase;
  }
  article .summary {
    font-size: 13px; line-height: 1.5; font-weight: 400;
  }
  .footer {
    margin-top: 18px; padding-top: 13px;
    border-top: 2px solid #000;
    display: flex; justify-content: space-between;
    font-size: 13px; font-weight: 700;
    text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="frame">
    <div class="masthead">
      <div class="top">No. """,
    ]
    parts.append(datetime.now().strftime("%j"))
    parts.append("""</div>
      <h1>HN Zeitung</h1>
      <div class="sub">""")
    parts.append(escape(now))
    parts.append("""</div>
    </div>
    <div class="stories">
""")
    for i, it in enumerate(items, 1):
        title = escape(it.title or "(no title)")
        host = ""
        u = it.url
        if u:
            try:
                from urllib.parse import urlparse

                host = urlparse(u).netloc
            except Exception:
                host = ""
        meta = f"{it.score} pts · {it.descendants} c"
        if host:
            meta += f" · {escape(host)}"
        parts.append(f"""      <article>
        <div class="num">No. {i:02d}</div>
        <h2>{title}</h2>
        <div class="meta">{meta}</div>
        <div class="summary">{escape(it.summary)}</div>
      </article>
""")
    parts.append(f"""    </div>
    <div class="footer">
      <span>marc-julian.com</span>
      <span>HN · {datetime.now().strftime("%H:%M")}</span>
    </div>
  </div>
</body>
</html>""")
    return "".join(parts)


def _build_items() -> list[Item]:
    client = get_client()
    ids = fetch_top_story_ids()
    cache = load_cache()
    results: dict[int, Item] = {}
    with ThreadPoolExecutor(max_workers=5) as ex:
        futures = {ex.submit(process_story, client, sid, cache): sid for sid in ids}
        for f in as_completed(futures):
            sid = futures[f]
            r = f.result()
            if r:
                results[sid] = r
    save_cache(cache)
    return [results[sid] for sid in ids if sid in results]


class HnZeitungRenderer:
    async def render(self, size: Size = NATIVE_SIZE) -> bytes:
        items = await asyncio.to_thread(_build_items)
        html = render_html(items)
        # Supersample the proportional sans so its antialiased edges survive the
        # 1-bit threshold cleanly.
        return await html_to_bmp(html, size=size, scale=SCALE)
