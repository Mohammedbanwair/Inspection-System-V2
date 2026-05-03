from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
import certifi

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
ACCESS_TOKEN_MIN = 60 * 24

app = FastAPI()
api = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

CATS = ["electrical", "mechanical", "chiller", "panels"]
Category = Literal["electrical", "mechanical", "chiller", "panels"]
TargetType = Literal["machine", "chiller", "panel"]


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MIN)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


def allowed_categories(user: dict) -> List[str]:
    if user["role"] == "admin":
        return CATS
    sp = user.get("specialty")
    if sp == "electrical":
        return ["electrical", "panels"]
    if sp == "mechanical":
        return ["mechanical", "chiller"]
    return []


# Mapping: which target_type each category requires
CAT_TARGET = {
    "electrical": "machine",
    "mechanical": "machine",
    "chiller": "chiller",
    "panels": "panel",
}


class LoginIn(BaseModel):
    employee_number: str
    password: str


class UserCreate(BaseModel):
    employee_number: str
    password: str
    name: str
    role: Literal["admin", "technician"] = "technician"
    specialty: Optional[Literal["electrical", "mechanical"]] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[Literal["admin", "technician"]] = None
    specialty: Optional[Literal["electrical", "mechanical"]] = None


class EntityCreate(BaseModel):
    number: str
    name: Optional[str] = ""


class EntityUpdate(BaseModel):
    number: Optional[str] = None
    name: Optional[str] = None


class QuestionCreate(BaseModel):
    category: Category
    text: str
    order: int = 0


class QuestionUpdate(BaseModel):
    category: Optional[Category] = None
    text: Optional[str] = None
    order: Optional[int] = None


class AnswerIn(BaseModel):
    question_id: str
    answer: bool
    note: Optional[str] = ""


class InspectionCreate(BaseModel):
    category: Category
    target_type: TargetType
    target_id: str
    answers: List[AnswerIn]
    notes: Optional[str] = ""


# ---------- Auth ----------
@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    emp = body.employee_number.strip().upper()
    user = await db.users.find_one({"employee_number": emp})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "رقم الموظف أو كلمة المرور غير صحيحة")
    token = create_token(user["id"], user["employee_number"], user["role"])
    response.set_cookie(key="access_token", value=token, httponly=True, secure=False,
                        samesite="lax", max_age=ACCESS_TOKEN_MIN * 60, path="/")
    return {"token": token, "user": {
        "id": user["id"], "employee_number": user["employee_number"], "name": user["name"],
        "role": user["role"], "specialty": user.get("specialty"),
    }}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ---------- Users ----------
@api.get("/users")
async def list_users(_=Depends(require_admin)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)


@api.post("/users")
async def create_user(body: UserCreate, _=Depends(require_admin)):
    emp = body.employee_number.strip().upper()
    if not emp:
        raise HTTPException(400, "رقم الموظف مطلوب")
    if await db.users.find_one({"employee_number": emp}):
        raise HTTPException(400, "رقم الموظف مستخدم مسبقاً")
    specialty = body.specialty if body.role == "technician" else None
    if body.role == "technician" and not specialty:
        raise HTTPException(400, "يجب تحديد تخصص الفني")
    doc = {"id": str(uuid.uuid4()), "employee_number": emp, "name": body.name,
           "role": body.role, "specialty": specialty,
           "password_hash": hash_password(body.password),
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.users.insert_one(doc)
    doc.pop("password_hash"); doc.pop("_id", None)
    return doc


@api.patch("/users/{uid}")
async def update_user(uid: str, body: UserUpdate, _=Depends(require_admin)):
    upd = {}
    if body.name is not None: upd["name"] = body.name
    if body.role is not None: upd["role"] = body.role
    if body.specialty is not None: upd["specialty"] = body.specialty
    if body.password: upd["password_hash"] = hash_password(body.password)
    if not upd: raise HTTPException(400, "لا توجد حقول للتحديث")
    await db.users.update_one({"id": uid}, {"$set": upd})
    u = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    if not u: raise HTTPException(404, "غير موجود")
    return u


@api.delete("/users/{uid}")
async def delete_user(uid: str, admin=Depends(require_admin)):
    if uid == admin["id"]:
        raise HTTPException(400, "لا يمكن حذف حسابك")
    res = await db.users.delete_one({"id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "غير موجود")
    return {"ok": True}


# ---------- Entity factory (machines/chillers/panels) ----------
def make_entity_routes(coll_name: str, label: str, route: str):
    @api.get(route)
    async def list_items(user=Depends(get_current_user)):
        return await db[coll_name].find({}, {"_id": 0}).sort("number", 1).to_list(2000)

    @api.post(route)
    async def create_item(body: EntityCreate, _=Depends(require_admin)):
        num = body.number.strip()
        if await db[coll_name].find_one({"number": num}):
            raise HTTPException(400, f"{label}: الرقم موجود مسبقاً")
        doc = {"id": str(uuid.uuid4()), "number": num, "name": body.name or "",
               "created_at": datetime.now(timezone.utc).isoformat()}
        await db[coll_name].insert_one(doc); doc.pop("_id", None)
        return doc

    @api.patch(route + "/{iid}")
    async def patch_item(iid: str, body: EntityUpdate, _=Depends(require_admin)):
        upd = {k: v for k, v in body.model_dump(exclude_none=True).items()}
        if not upd: raise HTTPException(400, "لا توجد حقول")
        await db[coll_name].update_one({"id": iid}, {"$set": upd})
        d = await db[coll_name].find_one({"id": iid}, {"_id": 0})
        if not d: raise HTTPException(404, f"{label} غير موجود")
        return d

    @api.delete(route + "/{iid}")
    async def del_item(iid: str, _=Depends(require_admin)):
        res = await db[coll_name].delete_one({"id": iid})
        if res.deleted_count == 0: raise HTTPException(404, f"{label} غير موجود")
        return {"ok": True}


make_entity_routes("machines", "المكينة", "/machines")
make_entity_routes("chillers", "الشيلر", "/chillers")
make_entity_routes("panels", "اللوحة", "/panels")


# ---------- Questions ----------
@api.get("/questions")
async def list_questions(category: Optional[str] = None, user=Depends(get_current_user)):
    q: dict = {}
    if user["role"] != "admin":
        allowed = allowed_categories(user)
        if category:
            if category not in allowed:
                return []
            q["category"] = category
        else:
            q["category"] = {"$in": allowed}
    elif category:
        q["category"] = category
    return await db.questions.find(q, {"_id": 0}).sort([("category", 1), ("order", 1)]).to_list(2000)


@api.post("/questions")
async def create_question(body: QuestionCreate, _=Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), "category": body.category,
           "text": body.text, "order": body.order,
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.questions.insert_one(doc); doc.pop("_id", None)
    return doc


@api.patch("/questions/{qid}")
async def update_question(qid: str, body: QuestionUpdate, _=Depends(require_admin)):
    upd = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not upd: raise HTTPException(400, "لا توجد حقول")
    await db.questions.update_one({"id": qid}, {"$set": upd})
    q = await db.questions.find_one({"id": qid}, {"_id": 0})
    if not q: raise HTTPException(404, "غير موجود")
    return q


@api.delete("/questions/{qid}")
async def delete_question(qid: str, _=Depends(require_admin)):
    res = await db.questions.delete_one({"id": qid})
    if res.deleted_count == 0: raise HTTPException(404, "غير موجود")
    return {"ok": True}


# ---------- Inspections ----------
COOLDOWN_HOURS = 3


def _parse_iso(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


async def _get_last_inspection(target_id: str, category: str):
    return await db.inspections.find_one(
        {"target_id": target_id, "category": category},
        {"_id": 0},
        sort=[("created_at", -1)],
    )


@api.get("/inspections/cooldown")
async def cooldown(target_id: str, category: str, _=Depends(get_current_user)):
    last = await _get_last_inspection(target_id, category)
    if not last:
        return {"in_cooldown": False, "remaining_seconds": 0, "last_at": None}
    last_at = _parse_iso(last["created_at"])
    now = datetime.now(timezone.utc)
    elapsed = (now - last_at).total_seconds()
    cooldown_total = COOLDOWN_HOURS * 3600
    remaining = max(0, int(cooldown_total - elapsed))
    return {
        "in_cooldown": remaining > 0,
        "remaining_seconds": remaining,
        "cooldown_seconds": cooldown_total,
        "last_at": last["created_at"],
        "last_technician_name": last.get("technician_name", ""),
    }


@api.post("/inspections")
async def create_inspection(body: InspectionCreate, user=Depends(get_current_user)):
    if body.category not in allowed_categories(user):
        raise HTTPException(403, "لا تملك صلاحية هذا القسم")
    expected = CAT_TARGET[body.category]
    if body.target_type != expected:
        raise HTTPException(400, "نوع الهدف لا يطابق القسم")
    coll = {"machine": "machines", "chiller": "chillers", "panel": "panels"}[body.target_type]
    target = await db[coll].find_one({"id": body.target_id}, {"_id": 0})
    if not target:
        raise HTTPException(404, "العنصر غير موجود")

    # 3-hour cooldown per (target, category)
    last = await _get_last_inspection(body.target_id, body.category)
    if last:
        elapsed = (datetime.now(timezone.utc) - _parse_iso(last["created_at"])).total_seconds()
        remaining = COOLDOWN_HOURS * 3600 - elapsed
        if remaining > 0:
            mins = int(remaining // 60) + 1
            raise HTTPException(
                429,
                f"لا يمكن رفع فحص جديد لنفس العنصر قبل مرور {COOLDOWN_HOURS} ساعات. تبقّى ~{mins} دقيقة.",
            )

    doc = {"id": str(uuid.uuid4()), "category": body.category,
           "target_type": body.target_type, "target_id": body.target_id,
           "target_number": target["number"], "target_name": target.get("name", ""),
           "technician_id": user["id"], "technician_name": user["name"],
           "answers": [a.model_dump() for a in body.answers], "notes": body.notes or "",
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.inspections.insert_one(doc); doc.pop("_id", None)
    return doc


@api.get("/inspections")
async def list_inspections(
    target_number: Optional[str] = None, target_type: Optional[str] = None,
    category: Optional[str] = None, technician_id: Optional[str] = None,
    date_from: Optional[str] = None, date_to: Optional[str] = None,
    limit: int = 200, user=Depends(get_current_user),
):
    q: dict = {}
    if user["role"] != "admin":
        q["technician_id"] = user["id"]
    elif technician_id:
        q["technician_id"] = technician_id
    if target_number: q["target_number"] = {"$regex": f"^{target_number}", "$options": "i"}
    if target_type: q["target_type"] = target_type
    if category: q["category"] = category
    if date_from or date_to:
        rng: dict = {}
        if date_from: rng["$gte"] = date_from
        if date_to: rng["$lte"] = date_to + "T23:59:59"
        q["created_at"] = rng
    return await db.inspections.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)


@api.get("/inspections/export/csv")
async def export_csv(target_number: Optional[str] = None, target_type: Optional[str] = None,
                     category: Optional[str] = None, date_from: Optional[str] = None,
                     date_to: Optional[str] = None, _=Depends(require_admin)):
    q: dict = {}
    if target_number: q["target_number"] = {"$regex": f"^{target_number}", "$options": "i"}
    if target_type: q["target_type"] = target_type
    if category: q["category"] = category
    if date_from or date_to:
        rng: dict = {}
        if date_from: rng["$gte"] = date_from
        if date_to: rng["$lte"] = date_to + "T23:59:59"
        q["created_at"] = rng
    items = await db.inspections.find(q, {"_id": 0}).sort("created_at", -1).to_list(5000)
    questions = await db.questions.find({}, {"_id": 0}).to_list(2000)
    qmap = {x["id"]: x for x in questions}
    buf = io.StringIO(); buf.write("\ufeff")
    buf.write("التاريخ,النوع,الرقم,الاسم,الفني,القسم,السؤال,الإجابة,ملاحظة\n")
    type_map = {"machine": "مكينة", "chiller": "شيلر", "panel": "لوحة"}
    cat_map = {"electrical": "كهرباء", "mechanical": "ميكانيكا", "chiller": "شيلر", "panels": "لوحات"}
    for insp in items:
        for ans in insp.get("answers", []):
            qobj = qmap.get(ans["question_id"], {})
            text = (qobj.get("text", "") or "").replace(",", "،").replace("\n", " ")
            note = (ans.get("note", "") or "").replace(",", "،").replace("\n", " ")
            row = (f'{insp["created_at"]},{type_map.get(insp.get("target_type",""),"")},'
                   f'{insp.get("target_number","")},{insp.get("target_name","")},'
                   f'{insp["technician_name"]},{cat_map.get(insp.get("category",""),"")},'
                   f'{text},{"صح" if ans["answer"] else "خطأ"},{note}\n')
            buf.write(row)
    return StreamingResponse(iter([buf.getvalue().encode("utf-8")]),
                             media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": 'attachment; filename="inspections.csv"'})


@api.get("/inspections/{iid}")
async def get_inspection(iid: str, user=Depends(get_current_user)):
    doc = await db.inspections.find_one({"id": iid}, {"_id": 0})
    if not doc: raise HTTPException(404, "غير موجود")
    if user["role"] != "admin" and doc["technician_id"] != user["id"]:
        raise HTTPException(403, "غير مصرح")
    return doc


@api.delete("/inspections/{iid}")
async def delete_inspection(iid: str, _=Depends(require_admin)):
    res = await db.inspections.delete_one({"id": iid})
    if res.deleted_count == 0: raise HTTPException(404, "غير موجود")
    return {"ok": True}


@api.get("/inspections/{iid}/export/pdf")
async def export_pdf(iid: str, _=Depends(require_admin)):
    doc = await db.inspections.find_one({"id": iid}, {"_id": 0})
    if not doc: raise HTTPException(404, "غير موجود")
    questions = await db.questions.find({}, {"_id": 0}).to_list(2000)
    qmap = {x["id"]: x for x in questions}
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    y = height - 2 * cm
    type_label = {"machine": "Machine", "chiller": "Chiller", "panel": "Panel"}.get(doc.get("target_type", ""), "")
    cat_label = {"electrical": "Electrical", "mechanical": "Mechanical", "chiller": "Chiller", "panels": "Panels"}.get(doc.get("category", ""), "")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(2 * cm, y, f"Inspection Report - {type_label} #{doc.get('target_number','')}")
    y -= 0.7 * cm; c.setFont("Helvetica", 10)
    c.drawString(2 * cm, y, f"Section: {cat_label}"); y -= 0.5 * cm
    c.drawString(2 * cm, y, f"Date: {doc['created_at']}"); y -= 0.5 * cm
    c.drawString(2 * cm, y, f"Technician: {doc['technician_name']}"); y -= 0.8 * cm
    for a in doc.get("answers", []):
        q = qmap.get(a["question_id"], {})
        mark = "OK" if a["answer"] else "FAIL"
        c.drawString(2.4 * cm, y, f"[{mark}] {q.get('text','')[:80]}")
        y -= 0.5 * cm
        if y < 2 * cm:
            c.showPage(); y = height - 2 * cm
    c.showPage(); c.save(); buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="inspection_{doc.get("target_number","")}.pdf"'})


def _open_failures_pipeline():
    """Latest answer per (target_id, question_id). Only keep those still failing."""
    return [
        {"$unwind": "$answers"},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": {"target_id": "$target_id", "question_id": "$answers.question_id"},
            "latest_answer": {"$first": "$answers.answer"},
            "latest_note": {"$first": "$answers.note"},
            "latest_at": {"$first": "$created_at"},
            "inspection_id": {"$first": "$id"},
            "target_number": {"$first": "$target_number"},
            "target_type": {"$first": "$target_type"},
            "target_name": {"$first": "$target_name"},
            "category": {"$first": "$category"},
            "technician_name": {"$first": "$technician_name"},
        }},
        {"$match": {"latest_answer": False}},
        {"$sort": {"latest_at": -1}},
    ]


async def _count_open_failures() -> int:
    pipe = _open_failures_pipeline()
    pipe.append({"$count": "n"})
    async for d in db.inspections.aggregate(pipe):
        return d["n"]
    return 0


@api.get("/failures/open")
async def list_open_failures(
    target_number: Optional[str] = None,
    target_type: Optional[str] = None,
    category: Optional[str] = None,
    _=Depends(require_admin),
):
    pipe = _open_failures_pipeline()
    questions = await db.questions.find({}, {"_id": 0}).to_list(2000)
    qmap = {q["id"]: q for q in questions}
    results = []
    async for d in db.inspections.aggregate(pipe):
        if target_number and not (d.get("target_number") or "").upper().startswith(target_number.upper()):
            continue
        if target_type and d.get("target_type") != target_type:
            continue
        if category and d.get("category") != category:
            continue
        q = qmap.get(d["_id"]["question_id"], {})
        results.append({
            "target_id": d["_id"]["target_id"],
            "question_id": d["_id"]["question_id"],
            "question_text": q.get("text", ""),
            "target_number": d.get("target_number", ""),
            "target_name": d.get("target_name", ""),
            "target_type": d.get("target_type", ""),
            "category": d.get("category", ""),
            "technician_name": d.get("technician_name", ""),
            "inspection_id": d.get("inspection_id", ""),
            "note": d.get("latest_note", ""),
            "since": d.get("latest_at", ""),
        })
    return results


@api.get("/stats/overview")
async def stats_overview(_=Depends(require_admin)):
    total_inspections = await db.inspections.count_documents({})
    total_machines = await db.machines.count_documents({})
    total_chillers = await db.chillers.count_documents({})
    total_panels = await db.panels.count_documents({})
    total_techs = await db.users.count_documents({"role": "technician"})
    total_questions = await db.questions.count_documents({})
    today = datetime.now(timezone.utc).date().isoformat()
    today_count = await db.inspections.count_documents({"created_at": {"$gte": today}})
    pipeline = [{"$unwind": "$answers"}, {"$match": {"answers.answer": False}}, {"$count": "fails"}]
    fails = 0
    async for d in db.inspections.aggregate(pipeline):
        fails = d["fails"]
    open_fails = await _count_open_failures()
    return {"total_inspections": total_inspections, "total_machines": total_machines,
            "total_chillers": total_chillers, "total_panels": total_panels,
            "total_technicians": total_techs, "total_questions": total_questions,
            "today_inspections": today_count, "total_fails": fails,
            "open_fails": open_fails}


# ---------- Seed ----------
DEFAULT_QUESTIONS = {
    "electrical": ["فحص لوحة الكهرباء الرئيسية", "التحقق من الكابلات والتوصيلات",
                   "قياس الجهد الكهربائي", "فحص الفيوزات والقواطع", "التأكد من التأريض"],
    "mechanical": ["فحص المحاور والبيرنقات", "التحقق من مستوى الزيت",
                   "فحص الأحزمة والسيور", "فحص البراغي والمسامير", "التأكد من عمل الصمامات"],
    "chiller": ["فحص درجة حرارة المبرد", "التحقق من ضغط الفريون",
                "فحص مروحة المكثف", "تنظيف فلاتر الشيلر", "فحص تسرب سوائل التبريد"],
    "panels": ["فحص مفاتيح اللوحة", "فحص المؤشرات والإشارات", "قياس درجة حرارة اللوحة",
               "فحص توصيلات الـ PLC", "التأكد من إغلاق اللوحة بإحكام"],
}

DEFAULT_TECHS = [
    ("EMP-001", "محمد", "tech123", "electrical"),
    ("EMP-002", "أحمد", "tech123", "electrical"),
    ("EMP-003", "خالد", "tech123", "mechanical"),
    ("EMP-004", "عبدالله", "tech123", "mechanical"),
]
ADMIN_EMP_NUMBER = "ADMIN-001"


@app.on_event("startup")
async def startup():
    # Migration: drop legacy email unique index if present
    try:
        existing_indexes = await db.users.index_information()
        if "email_1" in existing_indexes:
            await db.users.drop_index("email_1")
            logger.info("Dropped legacy users.email_1 index")
    except Exception as e:
        logger.warning(f"Index check failed (non-fatal): {e}")

    # Migration: backfill employee_number for any legacy user
    legacy = await db.users.find({"employee_number": {"$exists": False}}, {"_id": 0}).to_list(500)
    for idx, u in enumerate(legacy):
        if u.get("role") == "admin":
            emp = ADMIN_EMP_NUMBER
        else:
            # reuse email prefix if present, else sequential
            email = u.get("email") or ""
            prefix = email.split("@")[0].upper() if "@" in email else f"EMP-{idx+1:03d}"
            emp = prefix if prefix.startswith("EMP") or prefix.startswith("TECH") else f"EMP-{idx+1:03d}"
        # ensure unique
        base = emp
        suffix = 1
        while await db.users.find_one({"employee_number": emp, "id": {"$ne": u["id"]}}):
            suffix += 1
            emp = f"{base}-{suffix}"
        await db.users.update_one(
            {"id": u["id"]},
            {"$set": {"employee_number": emp}, "$unset": {"email": ""}},
        )

    await db.users.create_index("employee_number", unique=True)
    await db.users.create_index("id", unique=True)
    for c in ("machines", "chillers", "panels"):
        await db[c].create_index("number", unique=True)
        await db[c].create_index("id", unique=True)
    await db.questions.create_index("id", unique=True)
    await db.inspections.create_index("id", unique=True)
    await db.inspections.create_index("created_at")
    await db.inspections.create_index("target_number")

    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    admin_emp = os.environ.get("ADMIN_EMPLOYEE_NUMBER", ADMIN_EMP_NUMBER).upper()
    existing = await db.users.find_one({"employee_number": admin_emp})
    if not existing:
        await db.users.insert_one({"id": str(uuid.uuid4()), "employee_number": admin_emp,
                                   "name": "ادمن", "role": "admin", "specialty": None,
                                   "password_hash": hash_password(admin_pw),
                                   "created_at": datetime.now(timezone.utc).isoformat()})
    else:
        updates = {}
        if not verify_password(admin_pw, existing["password_hash"]):
            updates["password_hash"] = hash_password(admin_pw)
        if existing.get("name") == "المدير":
            updates["name"] = "ادمن"
        if updates:
            await db.users.update_one({"employee_number": admin_emp}, {"$set": updates})

    for emp, name, pw, sp in DEFAULT_TECHS:
        e = await db.users.find_one({"employee_number": emp})
        if not e:
            await db.users.insert_one({"id": str(uuid.uuid4()), "employee_number": emp, "name": name,
                                       "role": "technician", "specialty": sp,
                                       "password_hash": hash_password(pw),
                                       "created_at": datetime.now(timezone.utc).isoformat()})
        elif not e.get("specialty"):
            await db.users.update_one({"employee_number": emp}, {"$set": {"specialty": sp}})

    if await db.questions.count_documents({}) == 0:
        for cat, lines in DEFAULT_QUESTIONS.items():
            for i, t in enumerate(lines):
                await db.questions.insert_one({"id": str(uuid.uuid4()), "category": cat,
                                               "text": t, "order": i,
                                               "created_at": datetime.now(timezone.utc).isoformat()})
    else:
        # If panels questions are missing, add them
        if await db.questions.count_documents({"category": "panels"}) == 0:
            for i, t in enumerate(DEFAULT_QUESTIONS["panels"]):
                await db.questions.insert_one({"id": str(uuid.uuid4()), "category": "panels",
                                               "text": t, "order": i,
                                               "created_at": datetime.now(timezone.utc).isoformat()})

    if await db.chillers.count_documents({}) == 0:
        for n in ["C-1", "C-2", "C-3"]:
            await db.chillers.insert_one({"id": str(uuid.uuid4()), "number": n, "name": "",
                                          "created_at": datetime.now(timezone.utc).isoformat()})
    if await db.panels.count_documents({}) == 0:
        for n in ["P-1", "P-2", "P-3"]:
            await db.panels.insert_one({"id": str(uuid.uuid4()), "number": n, "name": "",
                                        "created_at": datetime.now(timezone.utc).isoformat()})

    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
                   allow_methods=["*"], allow_headers=["*"])



@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
                   allow_methods=["*"], allow_headers=["*"])
