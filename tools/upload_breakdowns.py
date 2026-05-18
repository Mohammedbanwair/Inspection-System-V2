"""
Upload the consolidated May 2026 breakdowns to https://www.inspet.pro
- Reads Breakdowns_May2026_Final.xlsx
- Maps machine numbers (7 → MC7, 40 → MC40, etc.)
- Handles NIGHT shifts that wrap past midnight (end_time gets next day)
- Posts to /api/breakdowns
"""
import os
import sys
import time
from datetime import datetime, timedelta

import openpyxl
import requests

SERVER   = os.environ.get("INSPET_SERVER",   "https://www.inspet.pro")
USER     = os.environ.get("INSPET_USER")
PASSWORD = os.environ.get("INSPET_PASSWORD")
FILE     = os.environ.get("INSPET_FILE",
                          os.path.join(os.path.dirname(__file__),
                                       "Breakdowns_May2026_Final.xlsx"))

if not USER or not PASSWORD:
    sys.exit("Set INSPET_USER and INSPET_PASSWORD env vars before running.")


def login():
    r = requests.post(f"{SERVER}/api/auth/login",
                      json={"employee_number": USER, "password": PASSWORD},
                      timeout=20)
    r.raise_for_status()
    return r.json()["token"]


def get_machines(token):
    r = requests.get(f"{SERVER}/api/machines",
                     headers={"Authorization": f"Bearer {token}"},
                     timeout=20)
    r.raise_for_status()
    return {m["number"]: m["id"] for m in r.json()}


def to_iso(date_str, time_str, add_day=False):
    dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    if add_day:
        dt = dt + timedelta(days=1)
    return dt.strftime("%Y-%m-%dT%H:%M:00")


def main():
    print(f"Loading {FILE}")
    wb = openpyxl.load_workbook(FILE, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    print(f"Found {len(rows)} rows")

    print(f"Logging in as {USER} ...")
    token = login()
    print("✓ Logged in")

    machines = get_machines(token)
    print(f"✓ Found {len(machines)} machines")

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    success = no_machine = errors = 0
    unmatched_set = set()

    for i, row in enumerate(rows, 1):
        _, date_str, mach_no, shift, from_t, to_t, dur, reason = row

        key = f"MC{mach_no}"
        machine_id = machines.get(key)
        if not machine_id:
            no_machine += 1
            unmatched_set.add(key)
            continue

        wrap = (to_t < from_t)  # crosses midnight
        start_iso = to_iso(date_str, from_t)
        end_iso   = to_iso(date_str, to_t, add_day=wrap)

        payload = {
            "machine_id": machine_id,
            "start_time": start_iso,
            "end_time":   end_iso,
            "brief_description":  reason[:200],
            "repair_description": "",
        }

        try:
            r = requests.post(f"{SERVER}/api/breakdowns", json=payload,
                              headers=headers, timeout=30)
            if r.status_code in (200, 201):
                success += 1
                if success % 25 == 0:
                    print(f"  ... {success} uploaded")
            else:
                errors += 1
                if errors <= 5:
                    print(f"  Row {i}: HTTP {r.status_code} — {r.text[:150]}")
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"  Row {i}: {e}")

        time.sleep(0.03)

    print("\n" + "=" * 50)
    print(f"  Total rows:        {len(rows)}")
    print(f"  ✓ Uploaded:        {success}")
    print(f"  ⚠ No machine:      {no_machine}")
    print(f"  ❌ Errors:          {errors}")
    if unmatched_set:
        print(f"  Unmatched mach #s: {sorted(unmatched_set)}")
    print("=" * 50)


if __name__ == "__main__":
    main()
