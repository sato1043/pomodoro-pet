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

TS=$(date +%s)
DEVICE_ID="smoke-test-$TS"
DEVICE_ID_2="smoke-test-$TS-2"
DEVICE_ID_3="smoke-test-$TS-3"
DEVICE_ID_4="smoke-test-$TS-4"
DOWNLOAD_KEY="smoke-key-$TS"
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

check_status() {
  local label="$1"
  local expected="$2"
  local actual="$3"

  if [ "$actual" = "$expected" ]; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label"
    echo "    expected: $expected"
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
RES=$(curl -s -X POST "$HEARTBEAT_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"appVersion\":\"0.1.0\"}")
echo "  Response: $RES"
check "trialValid=true" '"trialValid":true' "$RES"
check "registered=false" '"registered":false' "$RES"
check "trialDaysRemaining>0" '"trialDaysRemaining":30' "$RES"
echo ""

# --- Test 2: heartbeat（同じデバイス → トライアル継続） ---
echo "[2] heartbeat - 既存デバイス（トライアル継続）"
RES=$(curl -s -X POST "$HEARTBEAT_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"appVersion\":\"0.1.0\"}")
echo "  Response: $RES"
check "trialValid=true" '"trialValid":true' "$RES"
echo ""

# --- Test 3: register（download key 登録 — 1台目） ---
echo "[3] register - download key 登録（1台目）"
RES=$(curl -s -X POST "$REGISTER_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"downloadKey\":\"$DOWNLOAD_KEY\"}")
echo "  Response: $RES"
check "success=true" '"success":true' "$RES"
check "jwt存在" '"jwt":"ey' "$RES"
check "keyHint存在" '"keyHint":"smok' "$RES"
echo ""

# --- Test 4: register（同じキー・別デバイス — 2台目、日次レート制限内） ---
echo "[4] register - 同じキーで2台目"
RES=$(curl -s -X POST "$REGISTER_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID_2\",\"downloadKey\":\"$DOWNLOAD_KEY\"}")
echo "  Response: $RES"
check "success=true" '"success":true' "$RES"
echo ""

# --- Test 5: register（同じキー・別デバイス — 3台目、日次レート制限ギリギリ） ---
echo "[5] register - 同じキーで3台目"
RES=$(curl -s -X POST "$REGISTER_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID_3\",\"downloadKey\":\"$DOWNLOAD_KEY\"}")
echo "  Response: $RES"
check "success=true" '"success":true' "$RES"
echo ""

# --- Test 6: register（同じキー・別デバイス — 4台目、日次レート制限超過 → 429） ---
echo "[6] register - 同じキーで4台目（日次レート超過 → 429）"
HTTP_CODE=$(curl -s -o /tmp/smoke-test-res.json -w "%{http_code}" -X POST "$REGISTER_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID_4\",\"downloadKey\":\"$DOWNLOAD_KEY\"}")
RES=$(cat /tmp/smoke-test-res.json)
echo "  Response: $HTTP_CODE $RES"
check_status "HTTP 429" "429" "$HTTP_CODE"
check "Daily registration limit" '"Daily registration limit reached' "$RES"
echo ""

# --- Test 7: heartbeat（登録済みデバイス → registered + JWT） ---
echo "[7] heartbeat - 登録済みデバイス"
RES=$(curl -s -X POST "$HEARTBEAT_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"appVersion\":\"0.1.0\"}")
echo "  Response: $RES"
check "registered=true" '"registered":true' "$RES"
check "jwt存在" '"jwt":"ey' "$RES"
echo ""

# --- Test 8: register（同じキー・同じデバイス → 再登録成功、カウント消費しない） ---
echo "[8] register - 同じキーで再登録（カウント消費しない）"
RES=$(curl -s -X POST "$REGISTER_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"downloadKey\":\"$DOWNLOAD_KEY\"}")
echo "  Response: $RES"
check "success=true" '"success":true' "$RES"
echo ""

# --- Test 9: register（バリデーションエラー） ---
echo "[9] register - deviceId 未指定"
RES=$(curl -s -X POST "$REGISTER_URL" \
  -H "Content-Type: application/json" \
  -d '{"downloadKey":"some-key"}')
echo "  Response: $RES"
check "error存在" '"error"' "$RES"
echo ""

# --- Test 10: heartbeat（バリデーションエラー） ---
echo "[10] heartbeat - appVersion 未指定"
RES=$(curl -s -X POST "$HEARTBEAT_URL" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"some-device"}')
echo "  Response: $RES"
check "error存在" '"error"' "$RES"
echo ""

# --- Test 11: heartbeat（channel=alpha） ---
echo "[11] heartbeat - channel=alpha"
RES=$(curl -s -X POST "$HEARTBEAT_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"appVersion\":\"0.1.0\",\"channel\":\"alpha\"}")
echo "  Response: $RES"
check "latestVersion存在" '"latestVersion"' "$RES"
echo ""

# --- Test 12: heartbeat（channel=beta） ---
echo "[12] heartbeat - channel=beta"
RES=$(curl -s -X POST "$HEARTBEAT_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"appVersion\":\"0.1.0\",\"channel\":\"beta\"}")
echo "  Response: $RES"
check "latestVersion存在" '"latestVersion"' "$RES"
echo ""

# --- Test 13: heartbeat（不正なchannel → stableフォールバック） ---
echo "[13] heartbeat - 不正なchannel（stableフォールバック）"
RES=$(curl -s -X POST "$HEARTBEAT_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"appVersion\":\"0.1.0\",\"channel\":\"invalid\"}")
echo "  Response: $RES"
check "latestVersion存在" '"latestVersion"' "$RES"
echo ""

# --- クリーンアップ: テストで作成した Firestore ドキュメントを削除 ---
echo "[cleanup] Firestore テストデータを削除中..."
KEY_HASH=$(echo -n "$DOWNLOAD_KEY" | sha256sum | cut -d' ' -f1)
npx tsx scripts/cleanup-firestore.ts "$KEY_HASH" "$DEVICE_ID" "$DEVICE_ID_2" "$DEVICE_ID_3" "$DEVICE_ID_4" || echo "  cleanup skipped (ADC not set or error)"
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
