# Demo Verification Checklist

Use this checklist before presenting ReSource AI from a fresh checkout, a demo branch, or a deployed AWS environment. It focuses on proving that the core e-waste triage flow is usable without relying on stale local state.

## Prerequisites

- Node.js 22 or newer and npm 9 or newer are installed.
- AWS credentials are configured for the target account when testing deployment paths.
- Amazon Bedrock model access is enabled for:
  - `apac.amazon.nova-pro-v1:0`
  - `amazon.titan-image-generator-v1`
- Required frontend environment values are set in `frontend/.env`.
- Required GitHub Actions secrets are configured before testing the deployment workflow:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `VITE_API_KEY`

## Local Build Checks

Run these commands from the repository root:

```bash
npm install
npx tsc -p shared/tsconfig.json
npx tsc -p backend/tsconfig.json
cd frontend && npm run build
```

Expected result:

- Shared TypeScript contracts compile.
- Backend Lambda handlers compile.
- The frontend production build completes without missing environment or import errors.

## Frontend Smoke Test

Run the frontend locally:

```bash
cd frontend
npm run dev
```

Verify:

- The landing page loads at `http://localhost:5173`.
- Authentication mode matches `VITE_AUTH_MODE`.
- Device triage entry points render without console errors.
- Upload controls accept valid evidence images.
- Polling states show pending, partial, completed, or failed session states clearly.

## Backend and Pipeline Smoke Test

For a deployed or integration environment, verify the end-to-end session flow:

1. Submit a device description and at least one evidence image.
2. Confirm the session record is created in DynamoDB.
3. Confirm the async pipeline Lambda is invoked.
4. Confirm each stage result is persisted:
   - Quick Verdict
   - Safety Gate
   - Detailed Analysis
   - Second Life Ideas
   - Next Steps
5. Confirm the frontend can poll the session until completion.

Expected result:

- The final triage output includes safety guidance, salvage recommendations, and second-life project ideas.
- Safety constraints from the Safety Gate stage are reflected in downstream recommendations.
- Failed Bedrock responses are surfaced as failed or retryable session states rather than silent UI hangs.

## Deployment Checks

Before demoing a deployed environment:

- Confirm CloudFront serves the latest frontend build.
- Confirm API Gateway routes require `x-api-key`.
- Confirm protected routes require the expected legacy JWT or Cognito authorization mode.
- Confirm S3 media uploads are readable by the backend pipeline but not publicly exposed unless intended.
- Confirm CloudWatch logs show no repeated Lambda, DynamoDB, S3, or Bedrock permission errors.

## Demo Script

Use a device with visible condition details, such as a cracked phone, broken laptop, or damaged small appliance.

1. Open the landing page.
2. Start a new triage session.
3. Enter a short device description with condition, age, and visible damage.
4. Upload one or more evidence photos.
5. Submit the session and narrate the stage-by-stage progress.
6. Open the completed report and highlight:
   - risk classification
   - unsafe handling warnings
   - salvageable parts
   - personalized second-life project ideas

## Rollback Notes

- For frontend-only issues, redeploy the last known-good CloudFront/S3 build artifact.
- For authentication issues, switch local frontend testing back to `VITE_AUTH_MODE=legacy`.
- For infrastructure issues, redeploy with the previous CDK context and verify API Gateway, Lambda, DynamoDB, S3, and CloudFront resources before another demo.
