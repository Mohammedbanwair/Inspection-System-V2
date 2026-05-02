# PRD — نظام الفحص الرقمي (Digital Inspection System)

## Original Problem Statement
Arabic-speaking user needs to digitize paper-based machine/robot inspection workflow with section-based questions (Electrical / Mechanical / Chiller / Panels). User wants role-based access, search, exports, and language switching.

## Architecture
- Backend: FastAPI + MongoDB (motor) + JWT (bcrypt) + reportlab (PDF)
- Frontend: React (CRA + CRACO) + Tailwind + Sonner + Phosphor Icons + custom i18n (ar/en)
- All API under `/api/*`. Bearer token (localStorage) + httpOnly cookie fallback.

## User Personas
- Admin (1): manages machines, chillers, panels, questions, users; views/filters/exports all inspections.
- Electrical Technician: sees Electrical (machines) + Panels branches only.
- Mechanical Technician: sees Mechanical (machines) + Chiller branches only.

## Core Requirements (static)
- 4 question categories: electrical, mechanical, chiller, panels.
- 3 entities: machines, chillers (separate numbering from machines), panels.
- Each section is an INDEPENDENT inspection (no need to fill all sections at once).
- Yes/No answers + optional per-question note (shown when No).
- Admin exports CSV (Arabic Excel) and per-inspection PDF.
- Search by target number + date range + section + technician.
- Bilingual UI (Arabic RTL / English LTR) with toggle.

## Implemented (2026-02)
- JWT login/logout/me with bcrypt; admin + 4 specialty-typed technicians seeded.
- Specialty-aware question filter on `/api/questions`.
- Specialty-aware permission on `/api/inspections` POST (403 cross-section).
- CRUD: users (with specialty), machines, chillers, panels (separate numbers), questions, inspections.
- Inspection schema: `category` + `target_type` + `target_id` + `target_number` snapshot + `technician_id/name`.
- Admin: 7-tab dashboard (overview, inspections, machines, chillers, panels, questions, users).
- Tech: branch menu → inspection form with back button + Yes/No segmented controls.
- i18n provider with persistent language preference (localStorage), RTL/LTR auto-switch.
- CSV export with UTF-8 BOM; PDF per-inspection.
- 30/30 backend tests + frontend smoke green.

## Test Credentials
- Admin: admin@inspection.app / admin123
- Electrical techs: tech1@inspection.app, tech2@inspection.app / tech123
- Mechanical techs: tech3@inspection.app, tech4@inspection.app / tech123

## Backlog
### P1
- Translate inline toast/welcome strings when in English.
- PDF export with native Arabic glyph support (current PDF is Latin only).
- Localized RTL/LTR-aware date picker to replace native date inputs.
- Bulk import (CSV) for ~90 machines.
### P2
- Inspection trend charts per machine/technician.
- Photo attachments per question (object storage).
- Email/WhatsApp alert on failed inspections.
- Print-friendly per-machine summary.
