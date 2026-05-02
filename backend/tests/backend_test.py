"""Backend tests for inspection app - iteration 2 (panels + specialty refactor)"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@inspection.app", "password": "admin123"}
TECH_ELEC = {"email": "tech1@inspection.app", "password": "tech123"}   # electrical
TECH_MECH = {"email": "tech3@inspection.app", "password": "tech123"}   # mechanical


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)["token"]


@pytest.fixture(scope="module")
def tech_elec_token():
    return _login(TECH_ELEC)["token"]


@pytest.fixture(scope="module")
def tech_mech_token():
    return _login(TECH_MECH)["token"]


def H(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------- Auth ----------------
def test_login_admin():
    d = _login(ADMIN)
    assert d["user"]["role"] == "admin"


def test_login_tech_specialty():
    d = _login(TECH_ELEC)
    assert d["user"]["role"] == "technician"
    assert d["user"].get("specialty") == "electrical"
    d2 = _login(TECH_MECH)
    assert d2["user"].get("specialty") == "mechanical"


def test_login_bad():
    r = requests.post(f"{API}/auth/login",
                      json={"email": "admin@inspection.app", "password": "wrong"}, timeout=15)
    assert r.status_code == 401


# ---------------- Users + specialty ----------------
def test_create_tech_requires_specialty(admin_token):
    payload = {"email": "TEST_nospec@inspection.app", "password": "p1", "name": "TEST", "role": "technician"}
    r = requests.post(f"{API}/users", json=payload, headers=H(admin_token), timeout=15)
    assert r.status_code == 400


def test_create_tech_with_specialty(admin_token):
    payload = {"email": "TEST_elec@inspection.app", "password": "p1", "name": "TEST",
               "role": "technician", "specialty": "electrical"}
    r = requests.post(f"{API}/users", json=payload, headers=H(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    uid = r.json()["id"]
    assert r.json()["specialty"] == "electrical"
    requests.delete(f"{API}/users/{uid}", headers=H(admin_token), timeout=15)


def test_admin_user_no_specialty(admin_token):
    payload = {"email": "TEST_admin2@inspection.app", "password": "p1", "name": "TEST",
               "role": "admin", "specialty": "electrical"}
    r = requests.post(f"{API}/users", json=payload, headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    uid = r.json()["id"]
    assert r.json().get("specialty") is None
    requests.delete(f"{API}/users/{uid}", headers=H(admin_token), timeout=15)


# ---------------- Questions filter by specialty ----------------
def test_questions_admin_sees_all_categories(admin_token):
    r = requests.get(f"{API}/questions", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    cats = {q["category"] for q in r.json()}
    assert {"electrical", "mechanical", "chiller", "panels"}.issubset(cats)
    # 5 each = 20 total at minimum
    assert len(r.json()) >= 20


def test_questions_electrical_tech_filter(tech_elec_token):
    r = requests.get(f"{API}/questions", headers=H(tech_elec_token), timeout=15)
    assert r.status_code == 200
    cats = {q["category"] for q in r.json()}
    assert cats.issubset({"electrical", "panels"})
    assert "mechanical" not in cats and "chiller" not in cats


def test_questions_mechanical_tech_filter(tech_mech_token):
    r = requests.get(f"{API}/questions", headers=H(tech_mech_token), timeout=15)
    assert r.status_code == 200
    cats = {q["category"] for q in r.json()}
    assert cats.issubset({"mechanical", "chiller"})
    assert "electrical" not in cats and "panels" not in cats


def test_questions_filter_param_blocked_for_other_specialty(tech_elec_token):
    r = requests.get(f"{API}/questions?category=mechanical", headers=H(tech_elec_token), timeout=15)
    assert r.status_code == 200
    assert r.json() == []


# ---------------- Panels CRUD ----------------
def test_panels_seeded_listed(tech_elec_token):
    r = requests.get(f"{API}/panels", headers=H(tech_elec_token), timeout=15)
    assert r.status_code == 200
    nums = [p["number"] for p in r.json()]
    for n in ("P-1", "P-2", "P-3"):
        assert n in nums


def test_panels_tech_cannot_create(tech_elec_token):
    r = requests.post(f"{API}/panels", json={"number": "TEST_P9", "name": "x"},
                      headers=H(tech_elec_token), timeout=15)
    assert r.status_code == 403


def test_panels_admin_crud(admin_token):
    r = requests.post(f"{API}/panels", json={"number": "TEST_P_X1", "name": "Test"},
                      headers=H(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    r2 = requests.patch(f"{API}/panels/{pid}", json={"name": "Updated"},
                        headers=H(admin_token), timeout=15)
    assert r2.status_code == 200 and r2.json()["name"] == "Updated"
    g = requests.get(f"{API}/panels", headers=H(admin_token), timeout=15).json()
    assert any(p["id"] == pid and p["name"] == "Updated" for p in g)
    r3 = requests.delete(f"{API}/panels/{pid}", headers=H(admin_token), timeout=15)
    assert r3.status_code == 200
    g2 = requests.get(f"{API}/panels", headers=H(admin_token), timeout=15).json()
    assert all(p["id"] != pid for p in g2)


# ---------------- Chillers still work ----------------
def test_chillers_listed(tech_mech_token):
    r = requests.get(f"{API}/chillers", headers=H(tech_mech_token), timeout=15)
    assert r.status_code == 200
    nums = [c["number"] for c in r.json()]
    assert "C-1" in nums


# ---------------- Helper fixtures ----------------
@pytest.fixture(scope="module")
def a_machine(admin_token):
    payload = {"number": "TEST_M_X1", "name": "TEST"}
    r = requests.post(f"{API}/machines", json=payload, headers=H(admin_token), timeout=15)
    if r.status_code == 400:
        ms = requests.get(f"{API}/machines", headers=H(admin_token), timeout=15).json()
        m = next(x for x in ms if x["number"] == "TEST_M_X1")
        yield m
    else:
        assert r.status_code == 200, r.text
        m = r.json()
        yield m
        requests.delete(f"{API}/machines/{m['id']}", headers=H(admin_token), timeout=15)


@pytest.fixture(scope="module")
def a_panel(admin_token):
    payload = {"number": "TEST_P_X2", "name": "TEST Panel"}
    r = requests.post(f"{API}/panels", json=payload, headers=H(admin_token), timeout=15)
    if r.status_code == 400:
        items = requests.get(f"{API}/panels", headers=H(admin_token), timeout=15).json()
        p = next(x for x in items if x["number"] == "TEST_P_X2")
        yield p
    else:
        assert r.status_code == 200, r.text
        p = r.json()
        yield p
        requests.delete(f"{API}/panels/{p['id']}", headers=H(admin_token), timeout=15)


@pytest.fixture(scope="module")
def a_chiller(admin_token):
    items = requests.get(f"{API}/chillers", headers=H(admin_token), timeout=15).json()
    return items[0]


def _qs_for(token, cat):
    qs = requests.get(f"{API}/questions?category={cat}", headers=H(token), timeout=15).json()
    return [{"question_id": q["id"], "answer": True, "note": ""} for q in qs[:3]]


# ---------------- Inspections RBAC ----------------
def test_elec_can_post_electrical(admin_token, tech_elec_token, a_machine):
    payload = {"category": "electrical", "target_type": "machine",
               "target_id": a_machine["id"], "answers": _qs_for(tech_elec_token, "electrical")}
    r = requests.post(f"{API}/inspections", json=payload, headers=H(tech_elec_token), timeout=15)
    assert r.status_code == 200, r.text
    insp = r.json()
    assert insp["target_number"] == "TEST_M_X1" and insp["category"] == "electrical"
    requests.delete(f"{API}/inspections/{insp['id']}", headers=H(admin_token), timeout=15)


def test_elec_can_post_panels(admin_token, tech_elec_token, a_panel):
    payload = {"category": "panels", "target_type": "panel",
               "target_id": a_panel["id"], "answers": _qs_for(tech_elec_token, "panels")}
    r = requests.post(f"{API}/inspections", json=payload, headers=H(tech_elec_token), timeout=15)
    assert r.status_code == 200, r.text
    insp = r.json()
    assert insp["category"] == "panels" and insp["target_type"] == "panel"
    requests.delete(f"{API}/inspections/{insp['id']}", headers=H(admin_token), timeout=15)


def test_elec_cannot_post_mechanical(tech_elec_token, a_machine):
    payload = {"category": "mechanical", "target_type": "machine",
               "target_id": a_machine["id"], "answers": []}
    r = requests.post(f"{API}/inspections", json=payload, headers=H(tech_elec_token), timeout=15)
    assert r.status_code == 403


def test_elec_cannot_post_chiller(tech_elec_token, a_chiller):
    payload = {"category": "chiller", "target_type": "chiller",
               "target_id": a_chiller["id"], "answers": []}
    r = requests.post(f"{API}/inspections", json=payload, headers=H(tech_elec_token), timeout=15)
    assert r.status_code == 403


def test_mech_can_post_mechanical(admin_token, tech_mech_token, a_machine):
    payload = {"category": "mechanical", "target_type": "machine",
               "target_id": a_machine["id"], "answers": _qs_for(tech_mech_token, "mechanical")}
    r = requests.post(f"{API}/inspections", json=payload, headers=H(tech_mech_token), timeout=15)
    assert r.status_code == 200, r.text
    insp = r.json()
    assert insp["category"] == "mechanical"
    requests.delete(f"{API}/inspections/{insp['id']}", headers=H(admin_token), timeout=15)


def test_mech_can_post_chiller(admin_token, tech_mech_token, a_chiller):
    payload = {"category": "chiller", "target_type": "chiller",
               "target_id": a_chiller["id"], "answers": _qs_for(tech_mech_token, "chiller")}
    r = requests.post(f"{API}/inspections", json=payload, headers=H(tech_mech_token), timeout=15)
    assert r.status_code == 200, r.text
    insp = r.json()
    assert insp["category"] == "chiller" and insp["target_type"] == "chiller"
    requests.delete(f"{API}/inspections/{insp['id']}", headers=H(admin_token), timeout=15)


def test_mech_cannot_post_electrical(tech_mech_token, a_machine):
    payload = {"category": "electrical", "target_type": "machine",
               "target_id": a_machine["id"], "answers": []}
    r = requests.post(f"{API}/inspections", json=payload, headers=H(tech_mech_token), timeout=15)
    assert r.status_code == 403


def test_mech_cannot_post_panels(tech_mech_token, a_panel):
    payload = {"category": "panels", "target_type": "panel",
               "target_id": a_panel["id"], "answers": []}
    r = requests.post(f"{API}/inspections", json=payload, headers=H(tech_mech_token), timeout=15)
    assert r.status_code == 403


def test_inspection_target_category_mismatch(tech_elec_token, a_chiller):
    # electrical w/ chiller target — first the role is denied actually with category=electrical and target chiller
    # category electrical expects target_type=machine, send target_type=chiller -> 400
    payload = {"category": "electrical", "target_type": "chiller",
               "target_id": a_chiller["id"], "answers": []}
    r = requests.post(f"{API}/inspections", json=payload, headers=H(tech_elec_token), timeout=15)
    assert r.status_code == 400


# ---------------- Inspections filters ----------------
@pytest.fixture(scope="module")
def panel_inspection(admin_token, tech_elec_token, a_panel):
    payload = {"category": "panels", "target_type": "panel",
               "target_id": a_panel["id"], "answers": _qs_for(tech_elec_token, "panels")}
    r = requests.post(f"{API}/inspections", json=payload, headers=H(tech_elec_token), timeout=15)
    assert r.status_code == 200, r.text
    insp = r.json()
    yield insp
    requests.delete(f"{API}/inspections/{insp['id']}", headers=H(admin_token), timeout=15)


def test_filter_by_target_type(admin_token, panel_inspection):
    r = requests.get(f"{API}/inspections?target_type=panel", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1 and all(i["target_type"] == "panel" for i in items)


def test_filter_by_category(admin_token, panel_inspection):
    r = requests.get(f"{API}/inspections?category=panels", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    assert all(i["category"] == "panels" for i in r.json())


def test_filter_by_target_number(admin_token, panel_inspection):
    r = requests.get(f"{API}/inspections?target_number=TEST_P_X2", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    assert any(i["id"] == panel_inspection["id"] for i in r.json())


def test_filter_by_technician(admin_token, panel_inspection):
    r = requests.get(f"{API}/inspections?technician_id={panel_inspection['technician_id']}",
                     headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    assert all(i["technician_id"] == panel_inspection["technician_id"] for i in r.json())


def test_filter_by_date(admin_token, panel_inspection):
    today = panel_inspection["created_at"][:10]
    r = requests.get(f"{API}/inspections?date_from={today}&date_to={today}",
                     headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    assert any(i["id"] == panel_inspection["id"] for i in r.json())


# ---------------- CSV / Stats ----------------
def test_csv_export_includes_panel(admin_token, panel_inspection):
    r = requests.get(f"{API}/inspections/export/csv", headers=H(admin_token), timeout=20)
    assert r.status_code == 200
    assert r.content[:3] == b"\xef\xbb\xbf"
    text = r.content.decode("utf-8", errors="ignore")
    assert "TEST_P_X2" in text  # panel number present


def test_stats_overview_total_panels(admin_token):
    r = requests.get(f"{API}/stats/overview", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ["total_inspections", "total_machines", "total_chillers",
              "total_panels", "total_technicians", "total_questions", "today_inspections"]:
        assert k in d, f"missing key {k}"
    assert d["total_panels"] >= 3
