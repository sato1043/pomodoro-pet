/**
 * スモークテストで作成した Firestore ドキュメントを削除する
 *
 * 使い方: npx tsx scripts/cleanup-firestore.ts <deviceId> <keyHash>
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const deviceId = process.argv[2]
const keyHash = process.argv[3]

if (!deviceId || !keyHash) {
  console.error('Usage: npx tsx scripts/cleanup-firestore.ts <deviceId> <keyHash>')
  process.exit(1)
}

initializeApp({ credential: applicationDefault() })
const db = getFirestore()

async function main(): Promise<void> {
  await db.collection('devices').doc(deviceId).delete()
  console.log(`  deleted devices/${deviceId}`)
  await db.collection('keys').doc(keyHash).delete()
  console.log(`  deleted keys/${keyHash}`)
}

main().catch(e => {
  console.error('  cleanup error:', e.message)
  process.exit(1)
})
