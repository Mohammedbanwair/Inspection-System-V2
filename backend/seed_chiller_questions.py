"""
Run this script once on the server to replace chiller questions.
Usage:  python seed_chiller_questions.py
"""
import asyncio
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).parent / ".env")

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = os.getenv("DB_NAME", "inspection_db")

CHILLER_QUESTIONS = [
    {"text": "Check temperature setting (must be 8–25°C)",          "answer_type": "numeric", "unit": "°C"},
    {"text": "Check actual temperature – High",                      "answer_type": "numeric", "unit": "°C"},
    {"text": "Check actual temperature – Low",                       "answer_type": "numeric", "unit": "°C"},
    {"text": "Check water pump pressure – High",                     "answer_type": "numeric", "unit": "kg"},
    {"text": "Check water pump pressure – Low",                      "answer_type": "numeric", "unit": "kg"},
    {"text": "Check any abnormal sound in the unit",                 "answer_type": "yes_no",  "unit": None},
    {"text": "Clean air filter if necessary",                        "answer_type": "yes_no",  "unit": None},
    {"text": "Check cooling fan if working (air cooled chiller)",    "answer_type": "yes_no",  "unit": None},
    {"text": "Check any water leakage",                              "answer_type": "yes_no",  "unit": None},
    {"text": "Check all water valves",                               "answer_type": "yes_no",  "unit": None},
    {"text": "Clean water quality in the tank, change if necessary", "answer_type": "yes_no",  "unit": None},
    {"text": "Fill up with water + Anti-rust Chemical",              "answer_type": "yes_no",  "unit": None},
]


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    deleted = await db.questions.delete_many({"category": "chiller"})
    print(f"Deleted {deleted.deleted_count} existing chiller questions.")

    now = datetime.now(timezone.utc).isoformat()
    docs = [
        {
            "id": str(uuid.uuid4()),
            "category": "chiller",
            "text": q["text"],
            "order": i,
            "answer_type": q["answer_type"],
            "unit": q["unit"],
            "created_at": now,
        }
        for i, q in enumerate(CHILLER_QUESTIONS)
    ]
    await db.questions.insert_many(docs)
    print(f"Inserted {len(docs)} chiller questions successfully.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
