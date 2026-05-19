"""
Upload April 2026 breakdowns from Excel to inspet.pro
Run: python upload_breakdowns_april.py
"""
import sys, time, datetime, openpyxl, requests

EXCEL_PATH = "411d06b2-New_Microsoft_Excel_Worksheet_2.xlsx"
BASE_URL   = "https://inspet.pro/api"
USERNAME   = "33"
PASSWORD   = "33"

PLANNED_KEYWORDS = {"PREVENTIVE MAINTENANCE", "MACHINE UNDER MAINTENACE"}

# ── helpers ──────────────────────────────────────────────────────────────────

def combine(date_val, time_val, next_day=False):
    """Combine a date + time into an ISO datetime string."""
    if not isinstance(date_val, datetime.datetime):
        return None
    if not isinstance(time_val, datetime.time):
        return None
    d = date_val.date()
    if next_day:
        d += datetime.timedelta(days=1)
    dt = datetime.datetime.combine(d, time_val)
    return dt.strftime("%Y-%m-%dT%H:%M")


def build_datetimes(date_val, t_from, t_to):
    """Return (start_str, end_str) handling midnight-crossing."""
    start = combine(date_val, t_from)
    if t_to == datetime.time(0, 0) or (isinstance(t_from, datetime.time)
                                        and isinstance(t_to, datetime.time)
                                        and t_to < t_from):
        end = combine(date_val, t_to, next_day=True)
    else:
        end = combine(date_val, t_to)
    return start, end


# ── login ─────────────────────────────────────────────────────────────────────

session = requests.Session()
resp = session.post(f"{BASE_URL}/auth/login",
                    json={"username": USERNAME, "password": PASSWORD},
                    timeout=15)
resp.raise_for_status()
token = resp.json().get("access_token") or resp.json().get("token")
if not token:
    # cookie-based auth — token may already be set in session
    pass
else:
    session.headers["Authorization"] = f"Bearer {token}"
print("✓ Logged in")

# ── fetch machines (number → id) ──────────────────────────────────────────────

machines_resp = session.get(f"{BASE_URL}/machines", timeout=15)
machines_resp.raise_for_status()
machine_map = {int(m["number"]): m["id"] for m in machines_resp.json()
               if str(m.get("number", "")).isdigit() or isinstance(m.get("number"), (int, float))}
print(f"✓ Loaded {len(machine_map)} machines")

# ── parse Excel ───────────────────────────────────────────────────────────────

wb = openpyxl.load_workbook(EXCEL_PATH)
ws = wb["Sheet1"]

records = []
skipped = []
for i, row in enumerate(ws.iter_rows(min_row=4, values_only=True), start=4):
    date_val = row[7]
    shift    = row[8]
    machine_num = row[9]
    t_from   = row[11]
    t_to     = row[12]
    reason   = row[14]

    if not (date_val and machine_num and reason):
        continue

    machine_id = machine_map.get(int(machine_num))
    if not machine_id:
        skipped.append(f"row {i}: machine {machine_num} not found")
        continue

    start_str, end_str = build_datetimes(date_val, t_from, t_to)
    if not start_str or not end_str:
        skipped.append(f"row {i}: invalid time machine={machine_num} from={t_from} to={t_to}")
        continue

    is_planned = reason.strip().upper() in PLANNED_KEYWORDS or "PREVENTIVE" in reason.upper()

    records.append({
        "machine_id":        machine_id,
        "brief_description": reason.strip(),
        "repair_description": "",
        "start_time":        start_str,
        "end_time":          end_str,
        "is_planned":        is_planned,
    })

print(f"✓ Parsed {len(records)} records  ({len(skipped)} skipped)")
if skipped:
    for s in skipped[:10]:
        print("  SKIP:", s)

# ── upload ────────────────────────────────────────────────────────────────────

ok = 0
fail = 0
for idx, rec in enumerate(records, 1):
    try:
        r = session.post(f"{BASE_URL}/breakdowns", json=rec, timeout=15)
        if r.status_code in (200, 201):
            ok += 1
        else:
            fail += 1
            print(f"  [{idx}] FAIL {r.status_code}: {r.text[:120]}")
    except Exception as e:
        fail += 1
        print(f"  [{idx}] ERROR: {e}")

    if idx % 50 == 0:
        print(f"  Progress: {idx}/{len(records)}  ✓{ok} ✗{fail}")
    time.sleep(0.05)   # gentle throttle

print(f"\n✓ Done — uploaded {ok}, failed {fail}")
