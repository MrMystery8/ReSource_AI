# ♻️ ReSource AI — E-Waste Triage System

An AI-powered platform that analyzes electronic waste devices and provides intelligent salvage assessments, safety guidance, and second-life project ideas.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![AWS](https://img.shields.io/badge/AWS-CDK-orange)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)

## Overview

ReSource AI helps users make informed decisions about electronic waste by running a multi-stage AI analysis pipeline. Users describe their device, upload evidence photos, and receive a comprehensive triage report covering safety risks, salvageable components, and creative reuse opportunities.

### Key Features

- **Multi-stage AI Pipeline** — 5-stage structured triage from quick verdict through safe recovery guidance
- **Multimodal Analysis** — Text prompts can be combined with uploaded evidence images for richer device assessment
- **Real-time Progress** — The UI polls session state and renders stage-by-stage results as the backend completes them
- **File Upload** — Drag-and-drop evidence uploads backed by S3
- **Safety-First** — Dedicated safety gate with hazard identification and downstream risk constraints
- **Extended Product Flow** — Project guides, project grading, community sharing, leaderboard, and admin tooling
- **Modern UI** — Dark glassmorphism design with smooth animations and micro-interactions

## Architecture

```text
Browser
  │
  ├── CloudFront ──▶ S3 frontend bucket (static SPA hosting)
  │
  └── API Gateway REST API
         │
         ├── Auth / profile / admin / leaderboard Lambdas
         ├── Upload Lambda
         ├── Sessions submit / list / poll Lambdas
         ├── Guide / project / community Lambdas
         └── Async pipeline orchestrator Lambda
                    │
                    ├── Amazon Bedrock
                    │     ├── Amazon Nova Pro (text + multimodal analysis)
                    │     └── Amazon Titan Image Generator v1 (image generation support)
                    │
                    ├── DynamoDB
                    │     ├── sessions
                    │     ├── users
                    │     ├── projects
                    │     └── community
                    │
                    └── S3 media bucket
                          ├── uploaded evidence files
                          ├── avatar assets
                          └── generated concept images
```

### Frontend

- **Framework** — React 18 + React Router + Vite
- **Styling** — Tailwind CSS v4, custom design tokens, Framer Motion
- **Auth State** — Local token persistence with either legacy JWT auth or Cognito hosted login
- **Client-Server Contract** — Shared TypeScript types from the `shared` workspace

### Backend

- **Compute Model** — Many focused Node.js 20 Lambda handlers rather than one monolith
- **API Layer** — API Gateway REST API with API key enforcement on all routes
- **Protected Access** — API key plus either a custom Lambda JWT authorizer or a Cognito User Pool authorizer
- **Async Processing** — Session submission triggers a second Lambda asynchronously for long-running AI work

### AWS Services Used

| Service | Purpose |
|---|---|
| CloudFront | Serves the built SPA over HTTPS |
| S3 (frontend bucket) | Stores and serves the Vite production build |
| API Gateway REST API | Public backend API surface |
| Lambda | Route handlers, async triage pipeline, auth helpers |
| DynamoDB | Sessions, users, projects, and community data |
| S3 (media bucket) | Evidence uploads, avatars, generated images |
| Bedrock | AI analysis and image generation |
| Cognito | Optional modern auth mode with hosted UI and social sign-in |
| IAM | Per-function least-privilege access control |
| CloudWatch | Metrics dashboard for API, Lambda, DynamoDB, and CloudFront |

### Runtime Flow

1. The React SPA is served from CloudFront backed by an S3 bucket.
2. The browser calls API Gateway with `x-api-key` on every request and an `Authorization` token on protected routes.
3. `POST /sessions` creates a session record in DynamoDB and asynchronously invokes the pipeline Lambda.
4. The pipeline Lambda runs the AI stages sequentially, persists each stage result to DynamoDB, and updates session state.
5. The browser polls `GET /sessions/{sessionId}` until the session is complete or failed.
6. Supporting flows such as guide generation, project grading, leaderboard updates, and community activity use separate Lambdas over the same shared data stores.

### AI Architecture

- **Primary analysis model** — Amazon Bedrock `apac.amazon.nova-pro-v1:0`
- **Multimodal mode** — Uploaded image files are fetched from S3 and sent inline with prompts to Nova Pro
- **Image generation model** — Amazon Bedrock `amazon.titan-image-generator-v1`
- **Prompting strategy** — The backend builds structured prompts per stage and expects strict JSON responses
- **Safety controls** — The safety stage feeds risk constraints into downstream prompts so later recommendations stay within the handling tier

## Project Structure

```
ReSource_AI/
├── frontend/          # React SPA (Vite + React Router + Tailwind + Framer Motion)
│   └── src/
│       ├── components/   # UI components
│       ├── hooks/        # Custom React hooks
│       ├── services/     # API client
│       ├── auth/         # Cognito hosted-login helpers
│       └── contexts/     # Auth and UI state providers
├── backend/           # Lambda handlers, auth layer, AI pipeline, gamification
│   └── src/
│       ├── handlers/     # API route handlers
│       ├── pipeline/     # Prompt builder, stage executor, stage validators
│       ├── auth/         # JWT/Cognito identity resolution + user persistence
│       └── gamification/ # Points, badges, levels, streak logic
├── shared/            # Shared types, constants, and API contracts
├── infra/             # AWS CDK stack defining AWS resources and permissions
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

The backend is designed for AWS Lambda and is organized around route handlers rather than a long-running server process.

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

# Deploy infrastructure and application assets
npx cdk deploy
```

The CDK deploy provisions or updates:

- DynamoDB tables for sessions, users, projects, and community data
- The S3 frontend hosting bucket and media bucket
- CloudFront distribution for the SPA
- API Gateway routes and usage plan
- All Lambda handlers and their IAM permissions
- Optional Cognito resources when `authMode=cognito`
- A CloudWatch operations dashboard

## Pipeline Stages

The AI analysis runs through these stages in order:

1. **Quick Verdict** — Initial risk assessment and salvage score
2. **Safety Gate** — Hazard identification and safe/unsafe actions
3. **Detailed Analysis** — Component profiling and failure diagnosis
4. **Second Life Ideas** — Creative reuse project suggestions
5. **Next Steps** — Safe recovery route and action plan

Notes:

- The pipeline is asynchronous and runs inside a dedicated orchestrator Lambda after session submission.
- Uploaded image evidence is included in model calls when available.
- Session progress is persisted after each stage so the frontend can render partial results while polling.
- The shared types include `conceptVisual`, and the codebase includes image-generation support, but the active core pipeline currently runs the 5 stages above.

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API Gateway URL |
| `VITE_API_KEY` | API Gateway authentication key |
| `VITE_AUTH_MODE` | `legacy` (default) or `cognito` |
| `VITE_COGNITO_DOMAIN` | Cognito hosted UI domain (required for `cognito` mode) |
| `VITE_COGNITO_APP_CLIENT_ID` | Cognito app client ID (required for `cognito` mode) |
| `VITE_COGNITO_REDIRECT_SIGN_IN` | Cognito callback URL, e.g. `http://localhost:5173/auth/callback` |
| `VITE_COGNITO_REDIRECT_SIGN_OUT` | Post-logout URL, e.g. `http://localhost:5173/login` |

### Auth Modes and Rollback

The project now supports two authentication modes:

- **`legacy`**: Existing email/password + custom JWT Lambda authorizer flow.
- **`cognito`**: Cognito User Pool + hosted login flow (email/social providers).

In both modes, API Gateway still expects the frontend API key in `x-api-key`.

For local frontend rollback, switch:

```bash
VITE_AUTH_MODE=legacy
```

For infrastructure rollback, deploy with:

```bash
npx cdk deploy -c authMode=legacy
```

To enable Cognito in infrastructure:

```bash
npx cdk deploy -c authMode=cognito
```

Optional provider contexts for Cognito social login:

- Google: `googleClientId`, `googleClientSecret`
- Apple: `appleClientId`, `appleTeamId`, `appleKeyId`, `applePrivateKey`

## License

Private — All rights reserved.
