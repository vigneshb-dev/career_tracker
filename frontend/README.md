# 🌟 SkillTrace Frontend

[![Render App](https://img.shields.io/badge/Render-Live_App-46E3B7.svg?style=for-the-badge&logo=render&logoColor=white)](https://skilltracer-app.onrender.com/)
[![React](https://img.shields.io/badge/React-19.2+-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0+-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.3+-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

The frontend for **SkillTrace**, an enterprise-grade longitudinal workforce outcome intelligence platform.

> 🚀 **Live Production Deployment:** [https://skilltracer-app.onrender.com/](https://skilltracer-app.onrender.com/)

---

## 🎨 UI Architecture & Core Modules

1. **Living Trainee Outcome Passport (`TraineeDetail.tsx`)**:
   - Comprehensive multi-tab profile, evidence inventory, and verified credentials.
   - Dynamic self-healing routing for authenticated candidates (`/trainees/me` and `/trainees/:id`).
   - Visual badges for verifiable claims: `[Verified ✓]`, `[Pending ◷]`, `[AI Extracted]`, `[Editable]`.

2. **What-If Career Simulator (`CareerSimulator.tsx`)**:
   - Interactive simulation workspace comparing baseline competencies against hypothetical skill acquisition, target roles, and certifications.
   - Honest estimation guardrails (`SIMULATION` and `ESTIMATION` indicators).

3. **Skill Gap Intelligence & Cause Diagnostics (`AdminSkillIntelligence.tsx`, `CourseSkillAnalysis.tsx`)**:
   - **Modern light theme design** (`bg-slate-50`, crisp slate borders, rich indigo accents, readable light chart tooltips).
   - Cohort curriculum gap analytics, attrition cause analysis, non-placement diagnostics, and self-employment tracking.

4. **Career Digital Twin (`DigitalTwin.tsx`)**:
   - Competency projections, uncertainty bands over 30/90/180/365-day horizons, and peer velocity comparisons.

5. **Outcome Risk Engine (`OutcomeRisks.tsx`)**:
   - Multi-signal risk triage dashboard with explainable signals (Signal 1, Signal 2, Signal 3).
   - Closed-loop intervention actions: Accept $\to$ Start $\to$ Complete $\to$ Reassess.

6. **Role-Based Portals**:
   - Dedicated views and capabilities for **Trainees**, **Coaches**, **Employers**, and **Administrators**.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Production Build

```bash
npm run build
```

Build outputs are generated in the `dist/` directory.

### Environment Configuration

Create a `.env` file or provide environment variables:

```bash
# Backend API base URL
VITE_API_URL=https://skilltracer-app.onrender.com/api
# Or for local development:
# VITE_API_URL=http://localhost:8000/api
```
