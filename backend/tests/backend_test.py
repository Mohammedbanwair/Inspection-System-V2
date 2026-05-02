"""Backend tests for inspection app"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://robotic-forms.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@inspection.app", "password": "admin123"}
TECH = {"email": "tech1@inspection.app", "password": "tech123"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def tech_token():
    r = requests.post(f"{API}/auth/login", json=TECH, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(token):
    return {"Authorization": f"Bearer {token}"}


# ---- Auth ----
def test_login_admin():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "token" in d and d["user"]["role"] == "admin"


def test_login_tech():
    r = requests.post(f"{API}/auth/login", json=TECH, timeout=15)
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "technician"


def test_login_bad():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@inspection.app", "password": "wrong"}, timeout=15)
    assert r.status_code == 401


def test_me(admin_token):
    r = requests.get(f"{API}/auth/me", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["email"] == "admin@inspection.app"


# ---- Users ----
def test_list_users_admin(admin_token):
    r = requests.get(f"{API}/users", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    assert len(r.json()) >= 5  # admin + 4 techs


def test_list_users_tech_forbidden(tech_token):
    r = requests.get(f"{API}/users", headers=H(tech_token), timeout=15)
    assert r.status_code == 403


def test_user_crud(admin_token):
    payload = {"email": "TEST_user1@inspection.app", "password": "pass123", "name": "TEST User", "role": "technician"}
    r = requests.post(f"{API}/users", json=payload, headers=H(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    uid = r.json()["id"]
    # patch
    r2 = requests.patch(f"{API}/users/{uid}", json={"name": "TEST Updated"}, headers=H(admin_token), timeout=15)
    assert r2.status_code == 200 and r2.json()["name"] == "TEST Updated"
    # delete
    r3 = requests.delete(f"{API}/users/{uid}", headers=H(admin_token), timeout=15)
    assert r3.status_code == 200


# ---- Machines ----
def test_list_machines(tech_token):
    r = requests.get(f"{API}/machines", headers=H(tech_token), timeout=15)
    assert r.status_code == 200


def test_machine_create_tech_forbidden(tech_token):
    r = requests.post(f"{API}/machines", json={"number": "M-FORBID", "name": "x"}, headers=H(tech_token), timeout=15)
    assert r.status_code == 403


@pytest.fixture(scope="module")
def test_machine(admin_token):
    # cleanup if exists - not easily possible, use unique name
    payload = {"number": "TEST-M-001", "name": "TEST Robot Line"}
    r = requests.post(f"{API}/machines", json=payload, headers=H(admin_token), timeout=15)
    if r.status_code == 400:
        # already exists, fetch
        ms = requests.get(f"{API}/machines", headers=H(admin_token), timeout=15).json()
        m = next(x for x in ms if x["number"] == "TEST-M-001")
        yield m
    else:
        assert r.status_code == 200, r.text
        m = r.json()
        yield m
        requests.delete(f"{API}/machines/{m['id']}", headers=H(admin_token), timeout=15)


def test_machine_patch(admin_token, test_machine):
    r = requests.patch(f"{API}/machines/{test_machine['id']}", json={"name": "TEST Updated Name"},
                       headers=H(admin_token), timeout=15)
    assert r.status_code == 200 and r.json()["name"] == "TEST Updated Name"


# ---- Questions ----
def test_questions_seeded(admin_token):
    r = requests.get(f"{API}/questions", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    qs = r.json()
    assert len(qs) >= 15
    cats = set(q["category"] for q in qs)
    assert {"electrical", "mechanical", "chiller"}.issubset(cats)


def test_question_crud(admin_token):
    r = requests.post(f"{API}/questions",
                      json={"category": "electrical", "text": "TEST Question?", "order": 99},
                      headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    qid = r.json()["id"]
    r2 = requests.patch(f"{API}/questions/{qid}", json={"text": "TEST Updated"},
                        headers=H(admin_token), timeout=15)
    assert r2.status_code == 200 and r2.json()["text"] == "TEST Updated"
    r3 = requests.delete(f"{API}/questions/{qid}", headers=H(admin_token), timeout=15)
    assert r3.status_code == 200


def test_question_create_tech_forbidden(tech_token):
    r = requests.post(f"{API}/questions",
                      json={"category": "electrical", "text": "no", "order": 1},
                      headers=H(tech_token), timeout=15)
    assert r.status_code == 403


# ---- Inspections ----
@pytest.fixture(scope="module")
def created_inspection(admin_token, tech_token, test_machine):
    qs = requests.get(f"{API}/questions", headers=H(admin_token), timeout=15).json()
    answers = [{"question_id": q["id"], "answer": True, "note": ""} for q in qs[:5]]
    payload = {"machine_id": test_machine["id"], "answers": answers, "notes": "TEST note"}
    r = requests.post(f"{API}/inspections", json=payload, headers=H(tech_token), timeout=15)
    assert r.status_code == 200, r.text
    insp = r.json()
    assert insp["technician_name"] and insp["machine_number"] == "TEST-M-001"
    yield insp
    requests.delete(f"{API}/inspections/{insp['id']}", headers=H(admin_token), timeout=15)


def test_tech_sees_only_own(tech_token, created_inspection):
    r = requests.get(f"{API}/inspections", headers=H(tech_token), timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert all(i["technician_id"] == created_inspection["technician_id"] for i in items)


def test_admin_sees_all(admin_token, created_inspection):
    r = requests.get(f"{API}/inspections", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    assert any(i["id"] == created_inspection["id"] for i in r.json())


def test_inspection_filter_machine(admin_token, created_inspection):
    r = requests.get(f"{API}/inspections", headers=H(admin_token),
                     params={"machine_number": "TEST-M-001"}, timeout=15)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_get_inspection_by_id(tech_token, created_inspection):
    r = requests.get(f"{API}/inspections/{created_inspection['id']}", headers=H(tech_token), timeout=15)
    assert r.status_code == 200


# ---- CSV / PDF ----
def test_export_csv_admin(admin_token, created_inspection):
    r = requests.get(f"{API}/inspections/export/csv", headers=H(admin_token), timeout=20)
    assert r.status_code == 200, f"CSV export failed: {r.status_code} {r.text[:300]}"
    # BOM check
    assert r.content[:3] == b"\xef\xbb\xbf"
    assert "text/csv" in r.headers.get("content-type", "")


def test_export_csv_tech_forbidden(tech_token):
    r = requests.get(f"{API}/inspections/export/csv", headers=H(tech_token), timeout=15)
    assert r.status_code == 403


def test_export_pdf_admin(admin_token, created_inspection):
    r = requests.get(f"{API}/inspections/{created_inspection['id']}/export/pdf",
                     headers=H(admin_token), timeout=20)
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"


# ---- Stats ----
def test_stats_admin(admin_token):
    r = requests.get(f"{API}/stats/overview", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ["total_inspections", "total_machines", "total_technicians",
              "total_questions", "today_inspections"]:
        assert k in d


def test_stats_tech_forbidden(tech_token):
    r = requests.get(f"{API}/stats/overview", headers=H(tech_token), timeout=15)
    assert r.status_code == 403
