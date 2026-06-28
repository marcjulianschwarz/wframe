import logging
import sys

import structlog
from structlog.types import EventDict, Processor

from app.settings import settings

_is_local = settings.ENVIRONMENT == "LOCAL"
_log_level = logging.DEBUG if settings.DEBUG else logging.INFO


def _add_log_level_name(_: object, _s: str, event_dict: EventDict) -> EventDict:
    """Rename structlog's ``level`` to the ECS field ``log.level``."""
    if "level" in event_dict:
        event_dict["log.level"] = event_dict.pop("level")
    return event_dict


def _rename_logger_name(_: object, _s: str, event_dict: EventDict) -> EventDict:
    """Rename the stdlib logger name to the ECS field ``log.logger``."""
    if "logger" in event_dict:
        event_dict["log.logger"] = event_dict.pop("logger")
    return event_dict


# Processors shared by both stdlib- and structlog-originated records. These run
# before the renderer and enrich every event with context and metadata.
_shared_processors: list[Processor] = [
    structlog.contextvars.merge_contextvars,
    structlog.stdlib.add_logger_name,
    structlog.stdlib.add_log_level,
    structlog.processors.TimeStamper(fmt="iso", utc=True, key="@timestamp"),
    structlog.processors.StackInfoRenderer(),
    structlog.processors.format_exc_info,
]


def _build_renderer() -> Processor:
    if _is_local:
        return structlog.dev.ConsoleRenderer(colors=True, sort_keys=False)
    # Non-local: structured JSON with ECS-style field names.
    return structlog.processors.JSONRenderer()


def _json_field_renames() -> list[Processor]:
    """ECS field renames are only meaningful for the JSON sink."""
    if _is_local:
        return []
    return [_add_log_level_name, _rename_logger_name]


def setup_logging() -> None:
    """Configure structlog and route stdlib logging through it.

    Call once at startup, before creating any loggers.
    """
    renderer = _build_renderer()

    # structlog side: produce an event dict, then hand off to stdlib via
    # ProcessorFormatter so structlog and stdlib records share one renderer.
    structlog.configure(
        processors=[
            *_shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(_log_level),
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # stdlib side: a single handler whose formatter runs the same chain. The
    # foreign_pre_chain handles records that did NOT originate from structlog
    # (uvicorn, httpx, elasticapm) so they get the same context & shape.
    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=_shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            *_json_field_renames(),
            renderer,
        ],
    )

    # LOCAL renders to stderr (keeps stdout clean); JSON goes to stdout for shippers.
    stream = sys.stderr if _is_local else sys.stdout
    handler = logging.StreamHandler(stream)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(_log_level)

    # Let uvicorn/httpx propagate to root instead of using their own handlers.
    for name in ("uvicorn", "uvicorn.error"):
        lg = logging.getLogger(name)
        lg.handlers = []
        lg.propagate = True

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def create_logger(name: str) -> "structlog.stdlib.BoundLogger":
    """Return a structlog logger.

    Use like the stdlib logger, but you can attach structured context:

        logger = create_logger(__name__)
        logger.info("user logged in", user_id=42, ip=request.client.host)
    """
    return structlog.stdlib.get_logger(name)


# Re-exported for convenience: bind/unbind request-scoped context. Values bound
# to the context become top-level keys on every subsequent log line.
def bind_contextvars(**kwargs: object) -> None:
    """Bind key/value context to the current task's logging context."""
    _ = structlog.contextvars.bind_contextvars(**kwargs)


def unbind_contextvars(*keys: str) -> None:
    """Remove the given keys from the current task's logging context."""
    structlog.contextvars.unbind_contextvars(*keys)


def clear_contextvars() -> None:
    """Clear all bound context for the current task."""
    structlog.contextvars.clear_contextvars()
