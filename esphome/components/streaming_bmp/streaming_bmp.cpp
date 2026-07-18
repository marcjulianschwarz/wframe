#ifdef USE_ESP_IDF
#include "streaming_bmp.h"
#include "esp_http_client.h"
#include "esphome/components/wifi/wifi_component.h"
#include "esphome/core/application.h"
#include "esphome/core/color.h"
#include "esphome/core/log.h"
#include <algorithm>
#include <vector>

namespace esphome {
namespace streaming_bmp {

static const char *const TAG = "streaming_bmp";

// Outcome of a fetch+draw pass. Only OK should trigger a panel refresh; SKIP
// (HTTP 204 / "no image right now") and ERROR must leave the panel untouched so
// the last good frame stays on screen.
enum class FetchResult { OK, SKIP, ERROR };

// RAII owner for an esp_http_client handle. esp_http_client_init() allocates,
// and the only correct teardown is close()+cleanup(); doing this in a
// destructor guarantees no leak on any return path (current or future).
class HttpClient {
 public:
  explicit HttpClient(const esp_http_client_config_t &cfg)
      : handle_(esp_http_client_init(&cfg)) {}
  ~HttpClient() {
    if (handle_ != nullptr) {
      esp_http_client_close(handle_);
      esp_http_client_cleanup(handle_);
    }
  }
  // Non-copyable, non-movable: single owner of the handle.
  HttpClient(const HttpClient &) = delete;
  HttpClient &operator=(const HttpClient &) = delete;

  esp_http_client_handle_t get() const { return handle_; }
  bool valid() const { return handle_ != nullptr; }

 private:
  esp_http_client_handle_t handle_;
};

static constexpr size_t BMP_DATA_OFFSET_POS = 10;
static constexpr size_t BMP_WIDTH_POS = 18;
static constexpr size_t BMP_HEIGHT_POS = 22;
static constexpr size_t BMP_BPP_POS = 28;
static constexpr size_t HEADER_PEEK = 54;

static inline uint32_t rd32(const uint8_t *b, size_t o) {
  return (uint32_t)b[o] | ((uint32_t)b[o + 1] << 8) |
         ((uint32_t)b[o + 2] << 16) | ((uint32_t)b[o + 3] << 24);
}
static inline uint16_t rd16(const uint8_t *b, size_t o) {
  return (uint16_t)b[o] | ((uint16_t)b[o + 1] << 8);
}

void StreamingBmp::setup() {
  ESP_LOGCONFIG(TAG, "streaming_bmp setup, url=%s", url_.c_str());
}

void StreamingBmp::dump_config() {
  ESP_LOGCONFIG(TAG, "Streaming BMP:");
  ESP_LOGCONFIG(TAG, "  URL: %s", url_.c_str());
  ESP_LOGCONFIG(TAG, "  Offset: %d,%d", x_off_, y_off_);
}

// Helper: stream BMP from URL, write each pixel via the provided sink.
// Returns OK only when a complete, valid image was drawn; SKIP for HTTP 204
// (no image to show right now); ERROR for any transport/format failure.
template <typename Sink>
static FetchResult stream_pixels(const std::string &url, int x_off, int y_off,
                                 Sink &&sink) {
  esp_http_client_config_t cfg = {};
  cfg.url = url.c_str();
  cfg.timeout_ms = 8000;
  cfg.buffer_size = 512;
  cfg.buffer_size_tx = 256;
  // RAII: the handle is closed and freed when `http` goes out of scope, on every
  // return path below. No manual cleanup needed.
  HttpClient http(cfg);
  if (!http.valid()) {
    ESP_LOGE(TAG, "client init failed");
    return FetchResult::ERROR;
  }
  esp_http_client_handle_t client = http.get();

  esp_err_t err = esp_http_client_open(client, 0);
  if (err != ESP_OK) {
    ESP_LOGE(TAG, "open failed: %s", esp_err_to_name(err));
    return FetchResult::ERROR;
  }

  int total = esp_http_client_fetch_headers(client);
  int status = esp_http_client_get_status_code(client);
  ESP_LOGD(TAG, "status: %d content-length: %d", status, total);

  // 204 (and any non-200) means "no image right now" — e.g. paused, or between
  // refresh windows. Leave the display alone; this is not an error.
  if (status == 204) {
    ESP_LOGI(TAG, "204 no content, leaving display unchanged");
    return FetchResult::SKIP;
  }
  if (status != 200) {
    ESP_LOGW(TAG, "unexpected status %d, skipping", status);
    return FetchResult::ERROR;
  }

  uint8_t header[HEADER_PEEK];
  int got = 0;
  while (got < (int)HEADER_PEEK) {
    int r =
        esp_http_client_read(client, (char *)header + got, HEADER_PEEK - got);
    if (r <= 0) {
      ESP_LOGE(TAG, "header read failed");
      return FetchResult::ERROR;
    }
    got += r;
  }
  if (header[0] != 'B' || header[1] != 'M') {
    ESP_LOGE(TAG, "not a BMP");
    return FetchResult::ERROR;
  }
  uint32_t data_off = rd32(header, BMP_DATA_OFFSET_POS);
  int32_t width = (int32_t)rd32(header, BMP_WIDTH_POS);
  int32_t height_signed = (int32_t)rd32(header, BMP_HEIGHT_POS);
  uint16_t bpp = rd16(header, BMP_BPP_POS);
  bool flipped = height_signed > 0;
  int32_t height = flipped ? height_signed : -height_signed;

  ESP_LOGD(TAG, "BMP %dx%d bpp=%u data_off=%u flipped=%d", (int)width,
           (int)height, bpp, (unsigned)data_off, flipped);

  if (bpp != 1) {
    ESP_LOGE(TAG, "only 1-bit BMP supported (got %u)", bpp);
    return FetchResult::ERROR;
  }

  size_t consumed = HEADER_PEEK;
  while (consumed < data_off) {
    char skip[64];
    size_t want = std::min((size_t)sizeof(skip), (size_t)(data_off - consumed));
    int r = esp_http_client_read(client, skip, want);
    if (r <= 0) {
      ESP_LOGE(TAG, "skip read failed");
      return FetchResult::ERROR;
    }
    consumed += r;
  }

  const size_t row_bytes_raw = (width + 7) / 8;
  const size_t row_bytes = (row_bytes_raw + 3) & ~3u;

  // std::vector frees its backing store on scope exit; no manual delete.
  std::vector<uint8_t> row(row_bytes);

  for (int32_t r = 0; r < height; r++) {
    size_t row_got = 0;
    while (row_got < row_bytes) {
      int n = esp_http_client_read(client, (char *)row.data() + row_got,
                                   row_bytes - row_got);
      if (n <= 0) {
        ESP_LOGE(TAG, "row read failed at %d", (int)r);
        return FetchResult::ERROR;
      }
      row_got += n;
    }

    int dst_y = (flipped ? (height - 1 - r) : r) + y_off;
    for (int32_t x = 0; x < width; x++) {
      uint8_t byte = row[x >> 3];
      uint8_t bit = (byte >> (7 - (x & 7))) & 1;
      sink(x_off + x, dst_y, bit != 0);
    }
    if ((r & 31) == 0) {
      App.feed_wdt();
    }
  }

  return FetchResult::OK;
}

void StreamingBmp::update() {
  if (display_ == nullptr) {
    ESP_LOGE(TAG, "no display");
    return;
  }
  if (wifi::global_wifi_component == nullptr ||
      !wifi::global_wifi_component->is_connected()) {
    ESP_LOGW(TAG, "wifi not connected, skipping fetch");
    return;
  }
  ESP_LOGI(TAG, "fetching %s", url_.c_str());

  // Single request: stream_pixels reads the HTTP status and the BMP header
  // BEFORE drawing any pixel, so a 204/non-200/non-BMP response returns SKIP or
  // ERROR with the display buffer untouched. On 200+valid it streams pixels
  // straight into the display buffer, feeding the watchdog as it goes.
  // The 7.50inV2p Waveshare driver inverts on the physical push: a "white"
  // (COLOR_ON) pixel in the display buffer comes out as black ink on the panel.
  // The BMPs we serve are authored in normal polarity (a set bit = white/paper),
  // so we invert here to cancel the driver's inversion: a set bit is drawn as
  // black into the buffer, which the panel then flips back to white. This lets
  // the dashboards be authored as ordinary black-on-white pages.
  FetchResult result = stream_pixels(
      url_, x_off_, y_off_, [this](int x, int y, bool white) {
        display_->draw_pixel_at(x, y,
                                white ? Color(0x000000u) : Color(0xFFFFFFu));
      });

  if (result != FetchResult::OK) {
    // SKIP (204 / paused / between windows) or ERROR: do NOT push to the panel,
    // so the epaper keeps its last image and isn't re-flashed (avoids wear).
    ESP_LOGD(TAG, "no panel refresh (result=%d)", (int)result);
    return;
  }

  // Push the freshly-filled buffer to the panel exactly once. We call display()
  // (the SPI push) rather than update() so the buffer we just streamed isn't
  // cleared/re-filled by a lambda. The 7.5" panel busy-waits for seconds during
  // the push, so feed the watchdog right before handing off.
  ESP_LOGI(TAG, "complete image, pushing to panel");
  App.feed_wdt();
  display_->display();
  finished_callbacks_.call();
}

} // namespace streaming_bmp
} // namespace esphome
#endif // USE_ESP_IDF
