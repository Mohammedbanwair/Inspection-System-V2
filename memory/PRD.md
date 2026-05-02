# PRD — نظام الفحص الرقمي (Digital Inspection System)

## Original Problem Statement
Arabic-speaking user needs to digitize paper-based machine/robot inspection workflow. Each machine has a numbered sheet with questions split across Electrical / Mechanical / Chiller sections. Answers are Yes/No (صح/خطأ). User wants to later search by date + machine number.

## Architecture
- Backend: FastAPI + MongoDB (motor) + JWT (bcrypt)
- Frontend: React (CRA + CRACO) + Tailwind + Sonner + Phosphor Icons
- All API under `/api/*`. Auth via Bearer token (localStorage) + httpOnly cookie fallback.

## User Personas
- Admin (1): manages machines, questions, users; views/filters/exports all inspections.
- Technician (4): selects a machine, fills Yes/No answers across 3 tabs, submits.

## Core Requirements (static)
- Arabic RTL UI throughout.
- 3 fixed question categories: electrical, mechanical, chiller.
- Yes/No answers with optional per-question note (shown when No).
- Admin exports CSV (Excel-compatible Arabic) and per-inspection PDF.
- Search by machine number + date range; admin can also filter by technician.

## Implemented (2026-02)
- JWT login/logout/me with bcrypt.
- Admin + 4 technicians seeded, 15 default questions seeded (5 per category).
- CRUD: users (admin), machines, questions (admin), inspections (create by tech, manage by admin).
- Inspection stores technician_name + machine_number snapshots for reliable reporting.
- CSV export with UTF-8 BOM for Arabic Excel; PDF export per inspection.
- Admin stats: totals + today count + total fails.
- Fully RTL Arabic UI, large tap-targets, segmented Yes/No toggles.
- data-testid across all interactive elements.

## Test Credentials
- Admin: admin@inspection.app / admin123
- Technicians: tech1..4@inspection.app / tech123

## Backlog
### P1
- PDF export with Arabic glyph support (current PDF uses Latin; Arabic in CSV).
- Localized RTL date picker to replace native date inputs in admin filters.
- Bulk machine import (CSV) to quickly seed ~90 machines.
### P2
- Inspection trend charts (per machine / per technician).
- Photo attachments per question (object storage).
- Email/WhatsApp notification for failed inspections.
- Print-friendly per-machine inspection template.
