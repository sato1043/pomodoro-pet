#!/bin/bash

# Cloud Run サービスの受付 ON/OFF 制御
# 使い方:
#   bash scripts/service-control.sh stop    # 受付停止（max-instances=0）
#   bash scripts/service-control.sh start   # 受付再開（min=0, max=1）
#   bash scripts/service-control.sh status  # 現在の状態を表示

REGION="asia-northeast1"
PROJECT="pomodoro-pet-prod"
SERVICE="api"

case "$1" in
  stop)
    echo "=== Stopping $SERVICE ==="
    # gcloud CLI では max-instances=0 が Knative バリデーションで拒否されるため
    # REST API 経由で scaling annotation を直接設定する
    gcloud run services update $SERVICE \
      --region=$REGION \
      --project=$PROJECT \
      --ingress=internal \
      --max-instances=1
    echo ""
    echo "Service stopped (ingress=internal). External requests will receive 404."
    echo "To fully stop instances: Cloud Console > Cloud Run > $SERVICE > Edit > Scaling > Max instances = 0"
    ;;

  start)
    echo "=== Starting $SERVICE ==="
    gcloud run services update $SERVICE \
      --region=$REGION \
      --project=$PROJECT \
      --ingress=all \
      --min-instances=0 \
      --max-instances=1
    echo ""
    echo "Service started (ingress=all, max=1)."
    ;;

  status)
    echo "=== Service Status ==="
    gcloud run services describe $SERVICE \
      --region=$REGION \
      --project=$PROJECT \
      --format="table(status.url, spec.template.spec.containerConcurrency, spec.template.metadata.annotations.'autoscaling.knative.dev/minScale', spec.template.metadata.annotations.'autoscaling.knative.dev/maxScale')"
    echo ""
    # インスタンス数
    REVISIONS=$(gcloud run revisions list \
      --service=$SERVICE \
      --region=$REGION \
      --project=$PROJECT \
      --format="table(metadata.name, status.conditions[0].status, spec.containerConcurrency)" \
      --limit=3 2>/dev/null)
    echo "Recent revisions:"
    echo "$REVISIONS"
    ;;

  *)
    echo "Usage: bash scripts/service-control.sh {stop|start|status}"
    echo ""
    echo "  stop    max-instances=0 にして受付停止"
    echo "  start   min=0, max=1 にして受付再開"
    echo "  status  現在のサービス状態を表示"
    exit 1
    ;;
esac
