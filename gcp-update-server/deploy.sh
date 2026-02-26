#!/bin/bash
set -e

# Cloud Functions デプロイスクリプト
# 使い方: cd gcp-update-server && bash deploy.sh

REGION="asia-northeast1"
PROJECT="pomodoro-pet-prod"

echo "=== Building TypeScript ==="
npm run build

echo ""
echo "=== Deploying api ==="
gcloud functions deploy api \
  --gen2 \
  --runtime=nodejs22 \
  --region=$REGION \
  --project=$PROJECT \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=api \
  --source=. \
  --set-secrets="JWT_PRIVATE_KEY=jwt-private-key:latest" \
  --memory=256MB \
  --timeout=30s

echo ""
echo "=== Deploy complete ==="
echo ""
echo "API URL:"
API_URL=$(gcloud functions describe api --gen2 --region=$REGION --project=$PROJECT --format="value(serviceConfig.uri)")
echo "$API_URL"
echo ""
echo "Heartbeat: POST $API_URL/api/heartbeat"
echo "Register:  POST $API_URL/api/register"
echo ""
echo "Set VITE_HEARTBEAT_URL=$API_URL in .env.development"
