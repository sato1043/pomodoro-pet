/**
 * スモークテストで作成した Firestore ドキュメントを削除する
 *
 * 使い方: npx tsx scripts/cleanup-firestore.ts <keyHash> <deviceId1> [deviceId2] ...
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const keyHash = process.argv[2]
const deviceIds = process.argv.slice(3)

if (!keyHash || deviceIds.length === 0) {
  console.error('Usage: npx tsx scripts/cleanup-firestore.ts <keyHash> <deviceId1> [deviceId2] ...')
  process.exit(1)
}

initializeApp({ credential: applicationDefault() })
const db = getFirestore()

async function main(): Promise<void> {
  for (const deviceId of deviceIds) {
    await db.collection('devices').doc(deviceId).delete()
    console.log(`  deleted devices/${deviceId}`)
  }
  await db.collection('keys').doc(keyHash).delete()
  console.log(`  deleted keys/${keyHash}`)
}

main().catch(e => {
  console.error('  cleanup error:', e.message)
  process.exit(1)
})
