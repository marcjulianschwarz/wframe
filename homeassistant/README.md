# wframe — Home Assistant integration

Pushes the last 24 hours of a sensor's history to a [wframe](https://github.com/marcjulianschwarz/wframe)
epaper dashboard, so it can draw a temperature chart like the built-in weather dashboard.

Home Assistant's recorder already keeps the history; this integration reads it
and POSTs the full series to your wframe ingest URL. **wframe stores none of the
history** — it holds the pushed series only long enough to render the chart.

## Install (HACS)

1. In HACS → Integrations → ⋮ → *Custom repositories*, add this repo with
   category **Integration**.
2. Install **wframe** and restart Home Assistant.

## Configure

In wframe, open the Home Assistant dashboard settings and copy your sensor
ingest URL (it contains your private token). Then add to `configuration.yaml`:

```yaml
wframe:
  ingest_url: "https://<your-wframe>/ha/webhook/<token>/sensor"
  sensor: sensor.living_room_temperature
  push_interval_minutes: 15   # optional, default 15
```

Restart Home Assistant. The integration pushes once at startup and then every
`push_interval_minutes`. The sensor must be retained by the Recorder (the
default keeps ~10 days), and its state must be numeric.

## How it works

```
recorder (24h history) ──read──► wframe integration ──POST series──► wframe ──chart──► epaper
```

Only this integration talks to wframe; Home Assistant itself never exposes an
inbound webhook, and no home data is persisted off-device beyond the live render.
