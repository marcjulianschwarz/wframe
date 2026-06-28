from app.features.bitmap.bitmap_models import WeatherLocation
from app.features.bitmap.location_schemas import LocationRead


def location_to_read(loc: WeatherLocation) -> LocationRead:
    return LocationRead.model_validate(loc)
