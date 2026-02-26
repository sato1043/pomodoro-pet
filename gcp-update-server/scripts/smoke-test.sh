#!/bin/bash
set -e

# Cloud Functions スモークテスト
# 使い方: cd gcp-update-server && bash scripts/smoke-test.sh
#
# 前提: deploy.sh でデプロイ済み

REGION="asia-northeast1"
PROJECT="pomodoro-pet-prod"

API_URL=$(gcloud functions describe api --gen2 --region=$REGION --project=$PROJECT --format="value(serviceConfig.uri)" 2>/dev/null)

if [ -z "$API_URL" ]; then
  echo "FAIL: Cloud Functions URL を取得できない。デプロイ済みか確認すること。"
  exit 1
fi

HEARTBEAT_URL="$API_URL/api/heartbeat"
REGISTER_URL="$API_URL/api/register"

DEVICE_ID="smoke-test-$(date +%s)"
DOWNLOAD_KEY="smoke-key-$(date +%s)"
PASS=0
FAIL=0

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"

  if echo "$actual" | grep -q "$expected"; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label"
    echo "    expected to contain: $expected"
    echo "    actual: $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Smoke Test ==="
echo "Heartbeat: $HEARTBEAT_URL"
echo "Register:  $REGISTER_URL"
echo "DeviceId:  $DEVICE_ID"
echo ""

# --- Test 1: heartbeat（新規デバイス → トライアル開始） ---
echo "[1] heartbeat - 新規デバイス"
RES1=$(curl -s -X POST "$HEARTBEAT_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"appVersion\":\"0.1.0\"}")
echo "  Response: $RES1"
check "trialValid=true" '"trialValid":true' "$RES1"
check "registered=false" '"registered":false' "$RES1"
check "trialDaysRemaining>0" '"trialDaysRemaining":30' "$RES1"
echo ""

# --- Test 2: heartbeat（同じデバイス → トライアル継続） ---
echo "[2] heartbeat - 既存デバイス（トライアル継続）"
RES2=$(curl -s -X POST "$HEARTBEAT_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"appVersion\":\"0.1.0\"}")
echo "  Response: $RES2"
check "trialValid=true" '"trialValid":true' "$RES2"
echo ""

# --- Test 3: register（download key 登録） ---
echo "[3] register - download key 登録"
RES3=$(curl -s -X POST "$REGISTER_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"downloadKey\":\"$DOWNLOAD_KEY\"}")
echo "  Response: $RES3"
check "success=true" '"success":true' "$RES3"
check "jwt存在" '"jwt":"ey' "$RES3"
check "keyHint存在" '"keyHint":"smok' "$RES3"
echo ""

# --- Test 4: heartbeat（登録済みデバイス → registered + JWT） ---
echo "[4] heartbeat - 登録済みデバイス"
RES4=$(curl -s -X POST "$HEARTBEAT_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"appVersion\":\"0.1.0\"}")
echo "  Response: $RES4"
check "registered=true" '"registered":true' "$RES4"
check "jwt存在" '"jwt":"ey' "$RES4"
echo ""

# --- Test 5: register（同じキー・同じデバイス → 再登録成功） ---
echo "[5] register - 同じキーで再登録"
RES5=$(curl -s -X POST "$REGISTER_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"downloadKey\":\"$DOWNLOAD_KEY\"}")
echo "  Response: $RES5"
check "success=true" '"success":true' "$RES5"
echo ""

# --- Test 6: register（バリデーションエラー） ---
echo "[6] register - deviceId 未指定"
RES6=$(curl -s -X POST "$REGISTER_URL" \
  -H "Content-Type: application/json" \
  -d '{"downloadKey":"some-key"}')
echo "  Response: $RES6"
check "error存在" '"error"' "$RES6"
echo ""

# --- Test 7: heartbeat（バリデーションエラー） ---
echo "[7] heartbeat - appVersion 未指定"
RES7=$(curl -s -X POST "$HEARTBEAT_URL" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"some-device"}')
echo "  Response: $RES7"
check "error存在" '"error"' "$RES7"
echo ""

# --- クリーンアップ: テストで作成した Firestore ドキュメントを削除 ---
echo "[cleanup] Firestore テストデータを削除中..."
KEY_HASH=$(echo -n "$DOWNLOAD_KEY" | sha256sum | cut -d' ' -f1)
npx tsx scripts/cleanup-firestore.ts "$DEVICE_ID" "$KEY_HASH" || echo "  cleanup skipped (ADC not set or error)"
echo ""

# --- 結果 ---
echo "=== Result ==="
echo "PASS: $PASS / $((PASS + FAIL))"
if [ $FAIL -gt 0 ]; then
  echo "FAIL: $FAIL"
  exit 1
else
  echo "All passed."
fi
