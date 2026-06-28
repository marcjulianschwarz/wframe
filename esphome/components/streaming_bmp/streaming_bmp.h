#pragma once
#include "esphome/core/component.h"
#include "esphome/core/automation.h"
#include "esphome/components/display/display_buffer.h"
#include "esphome/components/waveshare_epaper/waveshare_epaper.h"
#include <string>

namespace esphome {
namespace streaming_bmp {

class StreamingBmp : public PollingComponent {
 public:
  void setup() override;
  void update() override;
  void dump_config() override;
  float get_setup_priority() const override { return setup_priority::AFTER_WIFI; }

  void set_url(const std::string &url) { url_ = url; }
  void set_offset(int x, int y) { x_off_ = x; y_off_ = y; }
  // The display is a waveshare_epaper panel: we draw into its buffer with
  // draw_pixel_at(), then push the whole buffer to the panel with display().
  void set_display(waveshare_epaper::WaveshareEPaperBase *d) { display_ = d; }
  void add_on_finished_callback(std::function<void()> &&cb) {
    finished_callbacks_.add(std::move(cb));
  }

 protected:
  std::string url_;
  int x_off_{0};
  int y_off_{0};
  waveshare_epaper::WaveshareEPaperBase *display_{nullptr};
  CallbackManager<void()> finished_callbacks_{};
};

class DownloadFinishedTrigger : public Trigger<> {
 public:
  explicit DownloadFinishedTrigger(StreamingBmp *parent) {
    parent->add_on_finished_callback([this]() { this->trigger(); });
  }
};

}  // namespace streaming_bmp
}  // namespace esphome
