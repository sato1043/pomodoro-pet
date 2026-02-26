/**
 * Firestore 初期データ投入スクリプト
 *
 * config/current ドキュメントを作成する。
 *
 * 使い方:
 *   cd gcp-update-server
 *   npm run init-firestore
 *
 * 前提:
 *   - gcloud auth application-default login 済み
 *   - GCLOUD_PROJECT 環境変数、または gcloud config の project が設定済み
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT

initializeApp({
  credential: applicationDefault(),
  projectId,
})

const db = getFirestore()

async function main(): Promise<void> {
  console.log(`Project: ${projectId ?? '(default from gcloud config)'}`)

  // config/current ドキュメント
  const configRef = db.collection('config').doc('current')
  const configDoc = await configRef.get()

  if (configDoc.exists) {
    console.log('config/current already exists:')
    console.log(JSON.stringify(configDoc.data(), null, 2))
    console.log('')
    console.log('Overwrite? (y/N)')

    const answer = await new Promise<string>((resolve) => {
      process.stdin.setEncoding('utf-8')
      process.stdin.once('data', (data: string) => resolve(data.trim().toLowerCase()))
      // 5秒でタイムアウト → No
      setTimeout(() => resolve('n'), 5000)
    })

    if (answer !== 'y') {
      console.log('Skipped.')
      process.exit(0)
    }
  }

  const configData = {
    latestVersion: '0.1.0',
    trialDays: 30,
    jwtExpiryDays: 30,
    serverMessage: null,
    forceUpdateBelowVersion: null,
    updatedAt: Timestamp.now(),
  }

  await configRef.set(configData)
  console.log('Created config/current:')
  console.log(JSON.stringify(configData, null, 2))

  process.exit(0)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
