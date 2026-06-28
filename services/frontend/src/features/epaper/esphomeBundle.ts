// Builds the wframe.yaml an ESPHome user pulls into their own device config as a
// package. It carries ONLY the wframe-specific bits — the streaming_bmp external
// component (fetched from the public wframe repo over git) and the streamer
// itself — parameterized via substitutions.
//
// The user keeps their own device config (board, wifi, spi, display) and adds:
//
//   packages:
//     wframe: !include wframe.yaml
//
// then overrides ${wframe_display_id} to point at their display. The bitmap URL
// is baked in here rather than served from a remote package because it contains
// a secret slug (the endpoint has no auth), so it must not live at a public URL.

import { type Epaper } from "@/lib/api";

/** YAML-escape a string for use as a double-quoted scalar. */
function yamlString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Render the minimal wframe package yaml, pre-filled with this epaper's URL. */
export function renderWframePackage(epaper: Epaper): string {
  return `# wframe ESPHome package — include this from your own device config.
#
# In your device yaml, declare a top-level substitutions: block (it overrides the
# defaults below) and include this file as a package:
#
#   substitutions:
#     wframe_display_id: my_epaper   # the id: of YOUR display
#
#   packages:
#     wframe: !include wframe.yaml
#
# Substitutions you set in your own config win over the ones in this package, so
# wframe_display_id (and wframe_x/wframe_y, if your image isn't at 0,0) are how
# you point the streamer at your hardware. Everything else — board, wifi, spi,
# display — stays in your own config.
#
# NOTE: wframe_url below is unique to your account and acts as a secret (the
# endpoint has no auth). Don't commit this file to a public repo or share it.

substitutions:
  # Your personal bitmap stream. Treat as a secret.
  wframe_url: ${yamlString(epaper.bitmap_url)}
  # Point this at the id: of the display in your own config.
  wframe_display_id: my_display
  wframe_x: "${epaper.image_x}"
  wframe_y: "${epaper.image_y}"

# The streaming_bmp component lives in the public wframe repo (no secret here).
external_components:
  - source:
      type: git
      url: https://github.com/marcjulianschwarz/wframe
      path: esphome/components
    components: [streaming_bmp]

http_request:
  verify_ssl: false

streaming_bmp:
  id: stream_full
  url: \${wframe_url}
  display_id: \${wframe_display_id}
  x: \${wframe_x}
  y: \${wframe_y}
  # Poll every 10s. The backend gates actual redraws (serve windows / 204
  # between), so a push only happens when a fresh image is returned.
  update_interval: 10s
`;
}

/** Trigger a browser download of the wframe package yaml for this epaper. */
export function downloadWframePackage(epaper: Epaper): void {
  const blob = new Blob([renderWframePackage(epaper)], {
    type: "application/x-yaml",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wframe.yaml";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
