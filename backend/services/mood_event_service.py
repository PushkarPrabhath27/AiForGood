from __future__ import annotations
import asyncio
import json
from typing import Any, Dict

_mood_queues: Dict[str, asyncio.Queue] = {}


def get_mood_queue(patient_id: str) -> asyncio.Queue:
    if patient_id not in _mood_queues:
        _mood_queues[patient_id] = asyncio.Queue()
    return _mood_queues[patient_id]


def cleanup_mood_queue(patient_id: str) -> None:
    _mood_queues.pop(patient_id, None)


async def push_mood_event(patient_id: str, data: Dict[str, Any]) -> None:
    queue = _mood_queues.get(patient_id)
    if queue:
        await queue.put({"type": "mood_update", "data": data})
