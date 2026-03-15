#!/bin/bash
set -e

# Cloud Functions スモークテスト
# 使い方: cd gcp-update-server && bash scripts/smoke-test.sh
#
# 前提: deploy.sh でデプロイ済み
#
# オプション環境変数:
#   SMOKE_TEST_DOWNLOAD_KEY  有効な itch.io download key を指定すると
#                            register 成功系テスト（3〜8）を実行する。
#                            未指定時はこれらのテストをスキップする。
#
# 例: SMOKE_TEST_DOWNLOAD_KEY=Xi0hATiCeYvowEIjVZajFZgWdKxd5ew814VkT7ks bash scripts/smoke-test.sh

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
DOWNLOAD_KEY="${SMOKE_TEST_DOWNLOAD_KEY:-}"
PASS=0
FAIL=0
SKIP=0

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

skip() {
  local label="$1"
  echo "  SKIP: $label"
  SKIP=$((SKIP + 1))
}

echo "=== Smoke Test ==="
echo "Heartbeat: $HEARTBEAT_URL"
echo "Register:  $REGISTER_URL"
echo "DeviceId:  $DEVICE_ID"
if [ -n "$DOWNLOAD_KEY" ]; then
  echo "DownloadKey: ${DOWNLOAD_KEY:0:4}****${DOWNLOAD_KEY: -4} (SMOKE_TEST_DOWNLOAD_KEY)"
else
  echo "DownloadKey: (未指定 — register成功系テスト3〜8はスキップ)"
fi
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

# --- Test 2b: register（無効なdownload key → itch.io API検証で拒否） ---
echo "[2b] register - 無効なdownload key（itch.io API検証 → 403）"
HTTP_CODE=$(curl -s -o /tmp/smoke-test-res.json -w "%{http_code}" -X POST "$REGISTER_URL" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"downloadKey\":\"fake-invalid-key-$TS\"}")
RES=$(cat /tmp/smoke-test-res.json)
echo "  Response: $HTTP_CODE $RES"
check_status "HTTP 403" "403" "$HTTP_CODE"
check "Invalid download key" '"Invalid download key"' "$RES"
echo ""

# --- Test 3〜8: register成功系（有効な download key が必要） ---
if [ -n "$DOWNLOAD_KEY" ]; then

  # --- Test 3: register（download key 登録 — 1台目） ---
  echo "[3] register - download key 登録（1台目）"
  RES=$(curl -s -X POST "$REGISTER_URL" \
    -H "Content-Type: application/json" \
    -d "{\"deviceId\":\"$DEVICE_ID\",\"downloadKey\":\"$DOWNLOAD_KEY\"}")
  echo "  Response: $RES"
  check "success=true" '"success":true' "$RES"
  check "jwt存在" '"jwt":"ey' "$RES"
  check "keyHint存在" '"keyHint"' "$RES"
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

else
  echo "[3-8] register 成功系テスト — SKIPPED（SMOKE_TEST_DOWNLOAD_KEY 未指定）"
  for i in 3 4 5 6 7 8; do
    skip "テスト $i"
  done
  echo ""
fi

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
if [ -n "$DOWNLOAD_KEY" ]; then
  KEY_HASH=$(echo -n "$DOWNLOAD_KEY" | sha256sum | cut -d' ' -f1)
else
  KEY_HASH=""
fi
FAKE_KEY_HASH=$(echo -n "fake-invalid-key-$TS" | sha256sum | cut -d' ' -f1)
CLEANUP_ARGS="$FAKE_KEY_HASH $DEVICE_ID"
if [ -n "$KEY_HASH" ]; then
  CLEANUP_ARGS="$KEY_HASH $CLEANUP_ARGS $DEVICE_ID_2 $DEVICE_ID_3 $DEVICE_ID_4"
fi
npx tsx scripts/cleanup-firestore.ts $CLEANUP_ARGS || echo "  cleanup skipped (ADC not set or error)"
echo ""

# --- 結果 ---
echo "=== Result ==="
TOTAL=$((PASS + FAIL))
echo "PASS: $PASS / $TOTAL"
if [ $SKIP -gt 0 ]; then
  echo "SKIP: $SKIP"
fi
if [ $FAIL -gt 0 ]; then
  echo "FAIL: $FAIL"
  exit 1
else
  echo "All passed."
fi

# --- 手動テスト案内 ---
if [ -z "$DOWNLOAD_KEY" ]; then
  echo ""
  echo "========================================"
  echo "  手動テスト: 新規 download key 登録"
  echo "========================================"
  echo ""
  echo "register 成功系テスト（3〜8）を実行するには、有効な itch.io"
  echo "download key を環境変数で指定して再実行する:"
  echo ""
  echo "  SMOKE_TEST_DOWNLOAD_KEY=<key> bash scripts/smoke-test.sh"
  echo ""
  echo "download key の発行手順:"
  echo "  1. https://itch.io/dashboard/game/4370345/download-keys を開く"
  echo "  2. 「Create download key」をクリック"
  echo "  3. Label に識別名（例: smoke-test）を入力"
  echo "  4. 「Download key can be claimed」にチェック（任意）"
  echo "  5. 生成された URL の末尾がキー値"
  echo "     例: https://...itch.io/.../download/<この部分がキー>"
  echo ""
fi
