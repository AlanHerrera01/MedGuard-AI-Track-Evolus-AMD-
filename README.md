# MedGuard AI — Autonomous Clinical & Compliance Auditor

[![Powered by AMD Cloud GPU (vLLM/ROCm)](https://img.shields.io/badge/Powered%20by-AMD%20Cloud%20GPU%20(vLLM%2FROCm)-FF6600?logo=amd&logoColor=white)](https://www.amd.com/ai)
[![Built on Evolus AI](https://img.shields.io/badge/Built%20on-Evolus%20AI-5D3FD3?logo=openai&logoColor=white)](https://www.evolus.ai/)
[![Track: Health & Wellbeing / Business Agents](https://img.shields.io/badge/Track-Health%20%26%20Wellbeing%20%2F%20Business%20Agents-0A74DA)](https://www.amdhackathon.com/)
[![Docker Compose Ready](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React + Vite](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://vitejs.dev/)

## Real Problem Statement

Healthcare and legal professionals spend hours auditing informed consent forms, surgical forms, and clinical-administrative records. This manual review creates three critical risks:

- **Operational burden**: Delays impacting patient scheduling and administrative workflows.
- **Human error**: Missing signatures, dates, required fields, or allergy warnings.
- **PII exposure**: Improper handling of personally identifiable/health information (PII/PHI), with implications for **GDPR** and **ISO/IEC 27001** compliance.

## Proposed Solution

**MedGuard AI** is an autonomous clinical-administrative compliance auditor that structures, analyzes, and flags omissions with a **default-to-caution** approach. Core principle: **It never replaces clinical judgment — it always requires human review when uncertainty exists**.

**Key Features:**

- **Compliance Agent**: Detects informed consent gaps, missing signatures/dates, legal risks, and data protection (PII) issues.
- **Intelligent Extraction**: Leverages **Evolus Document Extractor** to convert unstructured text into reusable structured data.
- **AMD GPU Reasoning**: Runs the Compliance Auditor on **AMD Cloud (vLLM/ROCm)** with **Llama-3.1-8B-Instruct** for deterministic JSON outputs.
- **Deterministic Fallback**: If GPU calls fail or JSON is invalid, a deterministic fallback agent returns a safe emergency structure with `requires_human_override: true` and a critical infrastructure risk.
- **Human-in-the-Loop**: Enforces `audit_confidence_score < 0.85 → requires_human_override = true`, mandating qualified professional review.
- **Security by Design**: GDPR data minimization, strict Pydantic v2 validation, resilient error handling, and zero diagnosis/treatment suggestions.

## System Architecture

```text
[User] → Frontend (React + Vite, i18n EN/ES)
                │  (POST /api/v1/audit with document_text)
                ▼
           Backend (FastAPI)
                │
        ┌───────┼─────────────────────────────────────────────────────────────┐
        │                                                               │
        ▼                                                               ▼
  Evolus AI Tools                                                    AMD Cloud GPU
  ├── Document Extractor (/ai-tools/document-extractor/run)       ├── TokenFactory (OpenAI-compatible)
  └── PII Redactor (/ai-tools/redaction/run)                      └── vLLM / ROCm + Llama-3.1-8B-Instruct
                │                                                               │
                └─────────────────────► Orchestrator (ClinicalOrchestrator) ◄─────┘
                                          ├── Step 1: Structured extraction
                                          ├── Step 2: Compliance agent reasoning
                                          ├── Step 3: Deterministic fallback (infra failure)
                                          └── Step 4: Confidence rule < 0.85 → override
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- **Evolus AI** credentials: `EVOLUS_API_KEY` and `EVOLUS_APPLICATION_ID`
- **AMD TokenFactory** token: `AMD_API_KEY` (endpoint defaults to `https://notebooks.amd.com/tokenfactory/v1`) — *optional for local dev: without it the dual connector runs in local mock mode (see below)*

## Quick Start (Docker)

**Step 1: Clone and configure**

```bash
git clone https://github.com/<organization>/medguard-ai.git
cd medguard-ai
cp .env.example .env
```

Edit `.env`:

```env
# Evolus AI
EVOLUS_API_KEY=your_evolus_api_key
EVOLUS_APPLICATION_ID=your_evolus_application_id

# AMD Cloud (vLLM/ROCm) — dual connector: auto|live|mock
AMD_MODE=auto
AMD_API_KEY=your_amd_token
AMD_TOKEN_ENDPOINT=https://notebooks.amd.com/tokenfactory/v1
AMD_MODEL_NAME=meta-llama/Llama-3.1-8B-Instruct
```

**Step 2: Build and run**

```bash
docker-compose up --build
```

**Step 3: Access the app**

- **Web UI**: [http://localhost:3000](http://localhost:3000) — includes **EN/ES** language toggle
- **API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

## Hybrid Local Development (Mock Mode)

The AMD connector (`backend/src/services/amd_client.py`) is a **dual connector**, so you can develop and test locally before the AMD instance is provisioned:

| `AMD_MODE` | Behavior |
|---|---|
| `auto` (default) | Uses **real vLLM/ROCm** if `AMD_TOKEN_ENDPOINT` + `AMD_API_KEY` are set; otherwise **simulates the audit locally** (deterministic, zero network). |
| `live` | Always calls the real AMD GPU endpoint. |
| `mock` | Never calls AMD; returns a local heuristic audit. |

Safety guarantees in mock mode (defense in depth):

- The simulated report **always** sets `requires_human_override=true`.
- `audit_confidence_score` is capped at **0.6** (< the orchestrator's 0.85 threshold), so the confidence rule forces human review every time.
- The response is tagged with an explicit `safety_notice` ("modo simulación local") so no simulated report can be mistaken for a GPU-audited one.
- Zero `httpx` calls: verified by the offline test suite.

Enable the real AMD path by filling `AMD_API_KEY` (and, if needed, `AMD_TOKEN_ENDPOINT`) in `.env` — no code changes required.

Run the offline dual-mode suite (no credentials, no network):

```bash
python backend/tests/test_amd_dual_mode.py
```

## Hackathon Evaluation Criteria

| Criterion | MedGuard AI Coverage |
|---|---|
| **Application of Technology** | Deep use of **Evolus AI Tools** and **AMD Cloud GPU (vLLM/ROCm)** via OpenAI-compatible API, Clean Architecture, strict Pydantic v2 validation. |
| **Business Value** | Addresses a real healthcare need: consent/audit automation, reduced legal risk, PII protection, GDPR/ISO 27001 alignment. |
| **Originality & Security** | Deterministic fallback, mandatory human-in-the-loop, data minimization, strict JSON parsing, resilient networking, safe contingency responses, no clinical diagnosis/treatment output. |

## Project Structure

```text
medguard-ai/
├── backend/
│   ├── src/
│   │   ├── core/        # Orchestrator + Compliance Agent prompts
│   │   ├── services/    # EvolusClient + AMDClient dual (live/mock) + MockAuditEngine
│   │   ├── schemas/     # Pydantic v2 DTOs
│   │   └── main.py      # FastAPI + global error handlers
│   ├── tests/           # Integration tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/  # DocumentUploader + AuditResults (EN/ES)
│   │   ├── services/    # api.js (auditDocument)
│   │   ├── i18n/         # translations EN/ES
│   │   └── App.jsx      # Responsive layout + header + language toggle
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

## Credits

Built for **AMD Developer Hackathon: ACT III (Evolus Track)** — **MedGuard AI** showcases how **Evolus AI** and **AMD Cloud GPU (vLLM/ROCm)** power secure, auditable, human-centered business agents for regulated industries.