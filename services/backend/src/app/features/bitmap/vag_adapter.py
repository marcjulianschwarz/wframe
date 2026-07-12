from app.features.bitmap.bitmap_models import VagStop
from app.features.bitmap.vag_schemas import VagStopRead


def vag_stop_to_read(stop: VagStop) -> VagStopRead:
    return VagStopRead.model_validate(stop)
