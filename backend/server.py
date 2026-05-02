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

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, EmailStr
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm

# ---------- Setup ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
ACCESS_TOKEN_MIN = 60 * 24  # 24h

app = FastAPI()
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- Helpers ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MIN),
    }
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


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


# ---------- Models ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: Literal["admin", "technician"]
    created_at: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["admin", "technician"] = "technician"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[Literal["admin", "technician"]] = None


class Machine(BaseModel):
    id: str
    number: str
    name: Optional[str] = ""
    created_at: str


class MachineCreate(BaseModel):
    number: str
    name: Optional[str] = ""


class MachineUpdate(BaseModel):
    number: Optional[str] = None
    name: Optional[str] = None


class Question(BaseModel):
    id: str
    category: Literal["electrical", "mechanical", "chiller"]
    text: str
    order: int = 0
    created_at: str


class QuestionCreate(BaseModel):
    category: Literal["electrical", "mechanical", "chiller"]
    text: str
    order: int = 0


class QuestionUpdate(BaseModel):
    category: Optional[Literal["electrical", "mechanical", "chiller"]] = None
    text: Optional[str] = None
    order: Optional[int] = None


class AnswerIn(BaseModel):
    question_id: str
    answer: bool  # True=صح, False=خطأ
    note: Optional[str] = ""


class InspectionCreate(BaseModel):
    machine_id: str
    answers: List[AnswerIn]
    notes: Optional[str] = ""


# ---------- Auth ----------
@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "البريد الإلكتروني أو كلمة المرور غير صحيحة")
    token = create_token(user["id"], user["email"], user["role"])
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=False,
        samesite="lax", max_age=ACCESS_TOKEN_MIN * 60, path="/"
    )
    return {
        "token": token,
        "user": {
            "id": user["id"], "email": user["email"],
            "name": user["name"], "role": user["role"],
        }
    }


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ---------- Users (Admin) ----------
@api.get("/users", response_model=List[UserOut])
async def list_users(_=Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return users


@api.post("/users", response_model=UserOut)
async def create_user(body: UserCreate, _=Depends(require_admin)):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "البريد الإلكتروني مستخدم مسبقاً")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": body.name,
        "role": body.role,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash")
    doc.pop("_id", None)
    return doc


@api.patch("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: str, body: UserUpdate, _=Depends(require_admin)):
    upd = {}
    if body.name is not None:
        upd["name"] = body.name
    if body.role is not None:
        upd["role"] = body.role
    if body.password:
        upd["password_hash"] = hash_password(body.password)
    if not upd:
        raise HTTPException(400, "لا توجد حقول للتحديث")
    await db.users.update_one({"id": user_id}, {"$set": upd})
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
    return user


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(400, "لا يمكن حذف حسابك الحالي")
    res = await db.users.delete_one({"id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "المستخدم غير موجود")
    return {"ok": True}


# ---------- Machines ----------
@api.get("/machines", response_model=List[Machine])
async def list_machines(_=Depends(get_current_user)):
    machines = await db.machines.find({}, {"_id": 0}).sort("number", 1).to_list(2000)
    return machines


@api.post("/machines", response_model=Machine)
async def create_machine(body: MachineCreate, _=Depends(require_admin)):
    num = body.number.strip()
    if await db.machines.find_one({"number": num}):
        raise HTTPException(400, "رقم المكينة موجود مسبقاً")
    doc = {
        "id": str(uuid.uuid4()),
        "number": num,
        "name": body.name or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.machines.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/machines/{machine_id}", response_model=Machine)
async def update_machine(machine_id: str, body: MachineUpdate, _=Depends(require_admin)):
    upd = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not upd:
        raise HTTPException(400, "لا توجد حقول للتحديث")
    await db.machines.update_one({"id": machine_id}, {"$set": upd})
    m = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    if not m:
        raise HTTPException(404, "المكينة غير موجودة")
    return m


@api.delete("/machines/{machine_id}")
async def delete_machine(machine_id: str, _=Depends(require_admin)):
    res = await db.machines.delete_one({"id": machine_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "المكينة غير موجودة")
    return {"ok": True}


# ---------- Questions ----------
@api.get("/questions", response_model=List[Question])
async def list_questions(category: Optional[str] = None, _=Depends(get_current_user)):
    q = {"category": category} if category else {}
    items = await db.questions.find(q, {"_id": 0}).sort([("category", 1), ("order", 1)]).to_list(2000)
    return items


@api.post("/questions", response_model=Question)
async def create_question(body: QuestionCreate, _=Depends(require_admin)):
    doc = {
        "id": str(uuid.uuid4()),
        "category": body.category,
        "text": body.text,
        "order": body.order,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.questions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/questions/{qid}", response_model=Question)
async def update_question(qid: str, body: QuestionUpdate, _=Depends(require_admin)):
    upd = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not upd:
        raise HTTPException(400, "لا توجد حقول للتحديث")
    await db.questions.update_one({"id": qid}, {"$set": upd})
    q = await db.questions.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(404, "السؤال غير موجود")
    return q


@api.delete("/questions/{qid}")
async def delete_question(qid: str, _=Depends(require_admin)):
    res = await db.questions.delete_one({"id": qid})
    if res.deleted_count == 0:
        raise HTTPException(404, "السؤال غير موجود")
    return {"ok": True}


# ---------- Inspections ----------
@api.post("/inspections")
async def create_inspection(body: InspectionCreate, user=Depends(get_current_user)):
    machine = await db.machines.find_one({"id": body.machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(404, "المكينة غير موجودة")
    doc = {
        "id": str(uuid.uuid4()),
        "machine_id": body.machine_id,
        "machine_number": machine["number"],
        "machine_name": machine.get("name", ""),
        "technician_id": user["id"],
        "technician_name": user["name"],
        "answers": [a.model_dump() for a in body.answers],
        "notes": body.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.inspections.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/inspections")
async def list_inspections(
    machine_number: Optional[str] = None,
    technician_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 200,
    user=Depends(get_current_user),
):
    q: dict = {}
    # Technicians can only see their own inspections
    if user["role"] != "admin":
        q["technician_id"] = user["id"]
    elif technician_id:
        q["technician_id"] = technician_id
    if machine_number:
        q["machine_number"] = {"$regex": f"^{machine_number}", "$options": "i"}
    if date_from or date_to:
        rng: dict = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            # inclusive end of day
            rng["$lte"] = date_to + "T23:59:59"
        q["created_at"] = rng
    items = await db.inspections.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return items


@api.get("/inspections/{iid}")
async def get_inspection(iid: str, user=Depends(get_current_user)):
    doc = await db.inspections.find_one({"id": iid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "الفحص غير موجود")
    if user["role"] != "admin" and doc["technician_id"] != user["id"]:
        raise HTTPException(403, "غير مصرح")
    return doc


@api.delete("/inspections/{iid}")
async def delete_inspection(iid: str, _=Depends(require_admin)):
    res = await db.inspections.delete_one({"id": iid})
    if res.deleted_count == 0:
        raise HTTPException(404, "الفحص غير موجود")
    return {"ok": True}


# ---------- Export CSV ----------
@api.get("/inspections/export/csv")
async def export_csv(
    machine_number: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    _=Depends(require_admin),
):
    q: dict = {}
    if machine_number:
        q["machine_number"] = {"$regex": f"^{machine_number}", "$options": "i"}
    if date_from or date_to:
        rng: dict = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            rng["$lte"] = date_to + "T23:59:59"
        q["created_at"] = rng
    items = await db.inspections.find(q, {"_id": 0}).sort("created_at", -1).to_list(5000)

    # Get all questions to map id -> text
    questions = await db.questions.find({}, {"_id": 0}).to_list(2000)
    qmap = {x["id"]: x for x in questions}

    buf = io.StringIO()
    buf.write("\ufeff")  # BOM for Excel Arabic support
    buf.write("التاريخ,رقم المكينة,اسم المكينة,الفني,القسم,السؤال,الإجابة,ملاحظة\n")
    for insp in items:
        for ans in insp.get("answers", []):
            qobj = qmap.get(ans["question_id"], {})
            cat = {"electrical": "كهرباء", "mechanical": "ميكانيكا", "chiller": "شيلر"}.get(qobj.get("category", ""), "")
            a = "صح" if ans["answer"] else "خطأ"
            text = (qobj.get("text", "") or "").replace(",", "،").replace("\n", " ")
            note = (ans.get("note", "") or "").replace(",", "،").replace("\n", " ")
            row = f'{insp["created_at"]},{insp["machine_number"]},{insp.get("machine_name","")},{insp["technician_name"]},{cat},{text},{a},{note}\n'
            buf.write(row)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue().encode("utf-8")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="inspections.csv"'},
    )


@api.get("/inspections/{iid}/export/pdf")
async def export_inspection_pdf(iid: str, _=Depends(require_admin)):
    doc = await db.inspections.find_one({"id": iid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "الفحص غير موجود")
    questions = await db.questions.find({}, {"_id": 0}).to_list(2000)
    qmap = {x["id"]: x for x in questions}

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    y = height - 2 * cm
    c.setFont("Helvetica-Bold", 14)
    c.drawString(2 * cm, y, f"Inspection Report - Machine #{doc['machine_number']}")
    y -= 0.8 * cm
    c.setFont("Helvetica", 10)
    c.drawString(2 * cm, y, f"Date: {doc['created_at']}")
    y -= 0.6 * cm
    c.drawString(2 * cm, y, f"Technician: {doc['technician_name']}")
    y -= 1 * cm

    for cat_key, cat_name in [("electrical", "Electrical"), ("mechanical", "Mechanical"), ("chiller", "Chiller")]:
        ans_in_cat = [a for a in doc.get("answers", []) if qmap.get(a["question_id"], {}).get("category") == cat_key]
        if not ans_in_cat:
            continue
        c.setFont("Helvetica-Bold", 12)
        c.drawString(2 * cm, y, cat_name)
        y -= 0.6 * cm
        c.setFont("Helvetica", 10)
        for a in ans_in_cat:
            q = qmap.get(a["question_id"], {})
            mark = "OK" if a["answer"] else "FAIL"
            line = f"[{mark}] {q.get('text','')[:80]}"
            c.drawString(2.4 * cm, y, line)
            y -= 0.5 * cm
            if y < 2 * cm:
                c.showPage()
                y = height - 2 * cm
        y -= 0.4 * cm

    c.showPage()
    c.save()
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="inspection_{doc["machine_number"]}.pdf"'},
    )


# ---------- Stats (Admin) ----------
@api.get("/stats/overview")
async def stats_overview(_=Depends(require_admin)):
    total_inspections = await db.inspections.count_documents({})
    total_machines = await db.machines.count_documents({})
    total_techs = await db.users.count_documents({"role": "technician"})
    total_questions = await db.questions.count_documents({})
    # today count
    today = datetime.now(timezone.utc).date().isoformat()
    today_count = await db.inspections.count_documents({"created_at": {"$gte": today}})
    # fails count
    pipeline = [{"$unwind": "$answers"}, {"$match": {"answers.answer": False}}, {"$count": "fails"}]
    fails = 0
    async for d in db.inspections.aggregate(pipeline):
        fails = d["fails"]
    return {
        "total_inspections": total_inspections,
        "total_machines": total_machines,
        "total_technicians": total_techs,
        "total_questions": total_questions,
        "today_inspections": today_count,
        "total_fails": fails,
    }


# ---------- Startup seed ----------
DEFAULT_QUESTIONS = {
    "electrical": [
        "فحص لوحة الكهرباء الرئيسية",
        "التحقق من الكابلات والتوصيلات",
        "قياس الجهد الكهربائي",
        "فحص الفيوزات والقواطع",
        "التأكد من التأريض",
    ],
    "mechanical": [
        "فحص المحاور والبيرنقات",
        "التحقق من مستوى الزيت",
        "فحص الأحزمة والسيور",
        "فحص البراغي والمسامير",
        "التأكد من عمل الصمامات",
    ],
    "chiller": [
        "فحص درجة حرارة المبرد",
        "التحقق من ضغط الفريون",
        "فحص مروحة المكثف",
        "تنظيف فلاتر الشيلر",
        "فحص تسرب سوائل التبريد",
    ],
}

DEFAULT_TECHS = [
    ("tech1@inspection.app", "محمد", "tech123"),
    ("tech2@inspection.app", "أحمد", "tech123"),
    ("tech3@inspection.app", "خالد", "tech123"),
    ("tech4@inspection.app", "عبدالله", "tech123"),
]


@app.on_event("startup")
async def startup():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.machines.create_index("number", unique=True)
    await db.machines.create_index("id", unique=True)
    await db.questions.create_index("id", unique=True)
    await db.inspections.create_index("id", unique=True)
    await db.inspections.create_index("created_at")
    await db.inspections.create_index("machine_number")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@inspection.app").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "المدير",
            "role": "admin",
            "password_hash": hash_password(admin_pw),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin seeded")
    else:
        # Always sync admin password with env to ensure fork-friendliness
        if not verify_password(admin_pw, existing["password_hash"]):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    # Seed default technicians
    for email, name, pw in DEFAULT_TECHS:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": email,
                "name": name,
                "role": "technician",
                "password_hash": hash_password(pw),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    # Seed default questions (only if empty)
    count = await db.questions.count_documents({})
    if count == 0:
        order = 0
        for cat, lines in DEFAULT_QUESTIONS.items():
            for i, t in enumerate(lines):
                await db.questions.insert_one({
                    "id": str(uuid.uuid4()),
                    "category": cat,
                    "text": t,
                    "order": i,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
                order += 1
        logger.info("Default questions seeded")

    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
