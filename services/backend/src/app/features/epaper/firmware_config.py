"""ESPHome firmware config generation for a device.

The web app offers a "download firmware config" button per epaper; this builds
the ready-to-flash ``wframe.yaml`` with that device's image URL baked in. It
mirrors ``esphome/wframe.yaml`` in the repo (the canonical config), but is kept
self-contained here so the backend container doesn't need the esphome/ tree on
disk. Secrets (WiFi) stay as ``!secret`` references — the user fills in a
``secrets.yaml`` next to the downloaded file; we never embed credentials.
"""

from __future__ import annotations

# The device's image URL is the only per-device value; everything else matches
# the repo's esphome/wframe.yaml. Keep the two in sync when the hardware config
# changes (pins, model, poll interval).
_TEMPLATE = """\
# wframe — ESPHome config for the 7.5" Waveshare e-paper frame.
#
# Auto-generated for this device by the wframe web app. Before flashing, create a
# `secrets.yaml` next to this file with your WiFi:
#
#   wifi_ssid: "Your WiFi"
#   wifi_password: "your-wifi-password"
#
# The `streaming_bmp.url` below is already set to this device's image URL.
#
# You also need the custom `streaming_bmp` component: copy the `components/`
# folder from the wframe repo (esphome/components) next to this file.

esphome:
  name: wframe
  friendly_name: Welcome Frame
  min_version: 2024.11.0

external_components:
  - source:
      type: local
      path: components

esp32:
  board: esp32dev
  framework:
    type: esp-idf

logger:

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
  ap:
    ssid: "Wframe Fallback"
    password: "test12345"
  on_connect:
    - logger.log: "WiFi connected"
    - delay: 2s
    - logger.log: "Triggering image fetch"
    # Trigger the streamer (not the display): it fetches and only refreshes the
    # panel if a full image arrived.
    - component.update: stream_full

http_request:
  verify_ssl: false

streaming_bmp:
  id: stream_full
  url: "{url}"
  display_id: my_display
  x: 0
  y: 0
  # Poll every 10s. A fetch+push takes ~7.5s on the loop task; at 5s the next
  # poll piled on before the previous finished and tripped the 5s task watchdog.
  # 10s leaves a gap after each cycle so the loop returns and feeds the watchdog.
  # The backend still gates actual redraws (8s serve windows / 204 between), so a
  # push only happens when an image is returned.
  update_interval: 10s

binary_sensor:
  - platform: gpio
    pin:
      number: GPIO0
      mode: INPUT_PULLUP
    name: "Boot Button"
    internal: true

spi:
  clk_pin: GPIO13
  mosi_pin: GPIO14

display:
  - platform: waveshare_epaper
    cs_pin:
      number: GPIO15 #D2
      ignore_strapping_warning: true
    dc_pin: GPIO27 #D3
    busy_pin:
      number: GPIO25 #D4
      inverted: true
    reset_pin: GPIO26 #D5
    model: 7.50inV2p # 7.50inV2p (HD) vs 7.50inv2
    reset_duration: 200ms
    # The display never refreshes on its own and has no lambda. streaming_bmp
    # fetches on its own interval, draws straight into this display's buffer, and
    # pushes to the panel (display()) only when a full image arrived — so the
    # epaper is never re-flashed on a 204/skip (avoids wear).
    update_interval: never
    full_update_every: 30
    rotation: 90
    id: my_display
"""


def build_firmware_config(bitmap_url: str) -> str:
    """Return a ready-to-flash ESPHome ``wframe.yaml`` for ``bitmap_url``."""
    return _TEMPLATE.format(url=bitmap_url)
