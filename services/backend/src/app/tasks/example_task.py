import asyncio
from typing import Never


async def print_hello():
    await asyncio.sleep(0.1)
    print("Task")


def start_example_task():
    task = asyncio.create_task(print_hello())
    return task


async def cancel_example_task(task: asyncio.Task[Never | None]):
    _ = task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
