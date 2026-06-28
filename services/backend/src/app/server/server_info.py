import os
import platform
from datetime import datetime
from typing import cast

import psutil
from pydantic.main import BaseModel

from app.settings import settings


class Server(BaseModel):
    name: str
    python_version: str
    platform: str
    timestamp: datetime
    environment: str
    image_tag: str


class Process(BaseModel):
    pid: int
    worker_count: int
    cpu_percent: float
    memory_used_mb: float


class ServerInfo(BaseModel):
    server: Server
    process: Process


def get_server_info() -> "ServerInfo":
    """Get process info for current process, all children (e.g. uvicorn worker)"""

    current = psutil.Process(os.getpid())
    processes = [current] + current.children(recursive=True)

    rss_bytes = sum(cast(int, p.memory_info().rss) for p in processes if p.is_running())
    cpu_percent = sum(p.cpu_percent(interval=0.1) for p in processes if p.is_running())

    return ServerInfo(
        server=Server(
            name=settings.APP_NAME,
            python_version=platform.python_version(),
            platform=platform.system(),
            timestamp=datetime.now(),
            environment=settings.ENVIRONMENT,
            image_tag=settings.IMAGE_TAG,
        ),
        process=Process(
            pid=current.pid,
            worker_count=len(processes),
            cpu_percent=round(cpu_percent, 1),
            memory_used_mb=round(rss_bytes / 1024 / 1024, 1),
        ),
    )
