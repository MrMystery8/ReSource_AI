# ♻️ ReSource AI — E-Waste Triage System

An AI-powered platform that analyzes electronic waste devices and provides intelligent salvage assessments, safety guidance, and second-life project ideas.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![AWS](https://img.shields.io/badge/AWS-CDK-orange)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)

## Overview

ReSource AI helps users make informed decisions about electronic waste by running a multi-stage AI analysis pipeline. Users describe their device, upload evidence photos, and receive a comprehensive triage report covering safety risks, salvageable components, and creative reuse opportunities.

### Key Features

- **Multi-stage AI Pipeline** — 7-stage analysis from quick verdict to detailed impact card
- **Real-time Progress** — Live polling with animated stage-by-stage results
- **File Upload** — Drag-and-drop device photos for improved analysis accuracy
- **Safety-First** — Dedicated safety gate with hazard identification and risk levels
- **Modern UI** — Dark glassmorphism design with smooth animations and micro-interactions

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend   │────▶│   API GW +   │────▶│  Lambda (Node)  │
│  React/Vite  │◀────│   Lambda     │◀────│  Pipeline Exec  │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │  Amazon Bedrock  │
                                          │  (Claude Model)  │
                                          └────────┬────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │    DynamoDB +    │
                                          │       S3         │
                                          └─────────────────┘
```

- **Frontend** — React 18, Vite, Tailwind CSS v4, Framer Motion
- **Backend** — AWS Lambda (TypeScript), API Gateway
- **AI** — Amazon Bedrock (Claude) for multi-stage analysis
- **Storage** — DynamoDB (sessions), S3 (file uploads)
- **Infrastructure** — AWS CDK (TypeScript)

## Project Structure

```
ReSource_AI/
├── frontend/          # React SPA (Vite + Tailwind + Framer Motion)
│   └── src/
│       ├── components/   # UI components
│       ├── hooks/        # Custom React hooks
│       └── services/     # API client
├── backend/           # Lambda handlers + AI pipeline
│   └── src/
│       ├── handlers/     # API route handlers
│       └── pipeline/     # AI pipeline stages
├── shared/            # Shared types & constants
├── infra/             # AWS CDK infrastructure
└── .github/workflows/ # CI/CD pipeline
```

## Getting Started

### Prerequisites

- Node.js 22+
- npm 9+
- AWS CLI configured (for deployment)

### Installation

```bash
# Install all workspace dependencies
npm install

# Build shared types (required first)
npx tsc -p shared/tsconfig.json
```

### Frontend Development

```bash
cd frontend

# Copy environment config
cp .env.example .env

# Edit .env with your API URL and key
# VITE_API_URL=https://your-api-gateway-url.amazonaws.com/prod
# VITE_API_KEY=your-api-key

# Start dev server
npm run dev
```

The frontend runs at `http://localhost:5173`.

### Landing Story Video Validation

When replacing `frontend/public/landing/video/laptop-to-project.mp4` for checkpoint scrubbing, verify keyframe density before shipping:

```bash
printf 'keyframes: '; ffprobe -v error -select_streams v:0 -show_entries frame=key_frame -of csv=p=0 frontend/public/landing/video/laptop-to-project.mp4 | grep -c '^1'; printf 'total frames: '; ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames -of csv=p=0 frontend/public/landing/video/laptop-to-project.mp4
```

For smooth `currentTime` scrubbing, keyframes should be near total frames (ideally equal).

### Backend Development

```bash
# Build backend
npx tsc -p backend/tsconfig.json
```

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Infrastructure tests
npm run test:infra
```

## Frontend Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript 5.4 | Type safety |
| Vite 5 | Build tool & dev server |
| Tailwind CSS 4 | Utility-first styling |
| Framer Motion | Animations & transitions |
| Lucide React | Icon library |

### UI Design

The frontend uses a modern dark theme with:

- **Glassmorphism cards** — Frosted glass effect with backdrop blur
- **Animated gradient background** — Subtle shifting color gradients
- **Floating particles** — Ambient background animation
- **Staggered reveals** — Components animate in sequentially
- **Micro-interactions** — Hover effects, focus rings, and button feedback
- **Responsive layout** — Mobile-first design that scales to desktop

## Deployment

The project deploys automatically via GitHub Actions on push to `main`.

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `VITE_API_KEY` | API Gateway key for frontend |

### Manual Deployment

```bash
# Build everything
npm run build
cd frontend && npm run build && cd ..

# Deploy infrastructure
npx cdk deploy
```

## Pipeline Stages

The AI analysis runs through these stages in order:

1. **Quick Verdict** — Initial risk assessment and salvage score
2. **Safety Gate** — Hazard identification and safe/unsafe actions
3. **Detailed Analysis** — Component profiling and failure diagnosis
4. **Second Life Ideas** — Creative reuse project suggestions
5. **Next Steps** — Safe recovery route and action plan

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API Gateway URL |
| `VITE_API_KEY` | API Gateway authentication key |

## License

Private — All rights reserved.
