import esphome.codegen as cg
import esphome.config_validation as cv
from esphome import automation
from esphome.const import CONF_ID, CONF_URL, CONF_UPDATE_INTERVAL, CONF_TRIGGER_ID

CODEOWNERS = ["@marcjulianschwarz"]
DEPENDENCIES = ["display", "wifi"]
AUTO_LOAD = ["http_request"]

streaming_bmp_ns = cg.esphome_ns.namespace("streaming_bmp")
StreamingBmp = streaming_bmp_ns.class_("StreamingBmp", cg.PollingComponent)

# The concrete 7.5" model inherits from WaveshareEPaperBase (not the templated
# WaveshareEPaper). Base already exposes display() (the SPI push) and, via
# DisplayBuffer, draw_pixel_at() — everything we need.
waveshare_ns = cg.esphome_ns.namespace("waveshare_epaper")
WaveshareEPaperBase = waveshare_ns.class_("WaveshareEPaperBase", cg.PollingComponent)
DownloadFinishedTrigger = streaming_bmp_ns.class_(
    "DownloadFinishedTrigger", automation.Trigger.template()
)

CONF_DISPLAY = "display_id"
CONF_X = "x"
CONF_Y = "y"
CONF_ON_DOWNLOAD_FINISHED = "on_download_finished"

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(StreamingBmp),
        cv.Required(CONF_URL): cv.string,
        cv.Required(CONF_DISPLAY): cv.use_id(WaveshareEPaperBase),
        cv.Optional(CONF_X, default=0): cv.int_,
        cv.Optional(CONF_Y, default=0): cv.int_,
        cv.Optional(CONF_UPDATE_INTERVAL, default="never"): cv.update_interval,
        cv.Optional(CONF_ON_DOWNLOAD_FINISHED): automation.validate_automation(
            {
                cv.GenerateID(CONF_TRIGGER_ID): cv.declare_id(DownloadFinishedTrigger),
            }
        ),
    }
).extend(cv.COMPONENT_SCHEMA)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    cg.add(var.set_url(config[CONF_URL]))
    cg.add(var.set_offset(config[CONF_X], config[CONF_Y]))
    cg.add(var.set_update_interval(config[CONF_UPDATE_INTERVAL]))
    disp = await cg.get_variable(config[CONF_DISPLAY])
    cg.add(var.set_display(disp))
    for conf in config.get(CONF_ON_DOWNLOAD_FINISHED, []):
        trigger = cg.new_Pvariable(conf[CONF_TRIGGER_ID], var)
        await automation.build_automation(trigger, [], conf)
