/**
 * Firestore 管理スクリプト（キー・デバイスの CRUD）
 *
 * 使い方:
 *   cd gcp-update-server
 *   npx tsx scripts/admin.ts <command> [args...]
 *
 * コマンド一覧:
 *   device:get <deviceId>                    デバイス情報を表示
 *   device:list                              全デバイス一覧
 *   device:delete <deviceId>                 デバイスを削除（紐づくキーのdevices[]からも除外）
 *   key:get <downloadKey>                    キー情報を表示（平文キーをハッシュして検索）
 *   key:get-hash <keyHash>                   キー情報を表示（ハッシュ値で直接検索）
 *   key:list                                 全キー一覧
 *   key:delete <downloadKey>                 キーを削除（紐づくデバイスのregisteredKeyもクリア）
 *   key:remove-device <downloadKey> <deviceId>  キーからデバイスを除外
 *   key:set-max <downloadKey> <maxDevices>   台数上限を変更
 *   config:get                               config/current を表示
 *   config:set <field> <value>               config/current のフィールドを更新
 *
 * 前提:
 *   gcloud auth application-default login 済み
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT

initializeApp({ credential: applicationDefault(), projectId })
const db = getFirestore()

function hashKey(downloadKey: string): string {
  return createHash('sha256').update(downloadKey).digest('hex')
}

function fmtTimestamp(ts: Timestamp | undefined): string {
  if (!ts) return '(none)'
  return new Date(ts.toMillis()).toISOString()
}

// --- device ---

async function deviceGet(deviceId: string): Promise<void> {
  const doc = await db.collection('devices').doc(deviceId).get()
  if (!doc.exists) {
    console.error(`Device not found: ${deviceId}`)
    process.exit(1)
  }
  const data = doc.data()!
  console.log(`Device: ${deviceId}`)
  console.log(`  registeredKey: ${data.registeredKey ?? '(none)'}`)
  console.log(`  keyHint:       ${data.keyHint ?? '(none)'}`)
  console.log(`  appVersion:    ${data.appVersion ?? '(none)'}`)
  console.log(`  trialStart:    ${fmtTimestamp(data.trialStartDate)}`)
  console.log(`  lastHeartbeat: ${fmtTimestamp(data.lastHeartbeat)}`)
  console.log(`  createdAt:     ${fmtTimestamp(data.createdAt)}`)
  console.log(`  heartbeatCount: ${data.heartbeatCount ?? 0} (${data.heartbeatDate ?? '?'})`)
}

async function deviceList(): Promise<void> {
  const snapshot = await db.collection('devices').get()
  if (snapshot.empty) {
    console.log('No devices found.')
    return
  }
  console.log(`Devices (${snapshot.size}):`)
  for (const doc of snapshot.docs) {
    const data = doc.data()
    const reg = data.registeredKey ? `registered (${data.keyHint ?? '?'})` : 'trial'
    const lastHb = fmtTimestamp(data.lastHeartbeat)
    console.log(`  ${doc.id}  ${reg}  lastHb=${lastHb}  v=${data.appVersion ?? '?'}`)
  }
}

async function deviceDelete(deviceId: string): Promise<void> {
  const doc = await db.collection('devices').doc(deviceId).get()
  if (!doc.exists) {
    console.error(`Device not found: ${deviceId}`)
    process.exit(1)
  }

  // 紐づくキーのdevices[]から除外
  const keyHash = doc.data()?.registeredKey as string | null
  if (keyHash) {
    const keyRef = db.collection('keys').doc(keyHash)
    const keyDoc = await keyRef.get()
    if (keyDoc.exists) {
      await keyRef.update({ devices: FieldValue.arrayRemove(deviceId) })
      console.log(`  Removed from keys/${keyHash}.devices[]`)
    }
  }

  await db.collection('devices').doc(deviceId).delete()
  console.log(`  Deleted devices/${deviceId}`)
}

// --- key ---

async function keyGet(keyHash: string): Promise<void> {
  const doc = await db.collection('keys').doc(keyHash).get()
  if (!doc.exists) {
    console.error(`Key not found: ${keyHash}`)
    process.exit(1)
  }
  const data = doc.data()!
  console.log(`Key: ${keyHash}`)
  console.log(`  devices:     [${(data.devices ?? []).join(', ')}]`)
  console.log(`  maxDevices:  ${data.maxDevices ?? 3}`)
  console.log(`  valid:       ${data.valid ?? '?'}`)
  console.log(`  validatedAt: ${fmtTimestamp(data.validatedAt)}`)
  console.log(`  createdAt:   ${fmtTimestamp(data.createdAt)}`)
}

async function keyList(): Promise<void> {
  const snapshot = await db.collection('keys').get()
  if (snapshot.empty) {
    console.log('No keys found.')
    return
  }
  console.log(`Keys (${snapshot.size}):`)
  for (const doc of snapshot.docs) {
    const data = doc.data()
    const devices = (data.devices as string[]) ?? []
    console.log(`  ${doc.id}  devices=${devices.length}/${data.maxDevices ?? 3}  valid=${data.valid ?? '?'}`)
  }
}

async function keyDelete(keyHash: string): Promise<void> {
  const doc = await db.collection('keys').doc(keyHash).get()
  if (!doc.exists) {
    console.error(`Key not found: ${keyHash}`)
    process.exit(1)
  }

  // 紐づくデバイスのregisteredKeyをクリア
  const devices = (doc.data()?.devices as string[]) ?? []
  for (const did of devices) {
    const dRef = db.collection('devices').doc(did)
    const dDoc = await dRef.get()
    if (dDoc.exists && dDoc.data()?.registeredKey === keyHash) {
      await dRef.update({ registeredKey: null, keyHint: null })
      console.log(`  Cleared registeredKey on devices/${did}`)
    }
  }

  await db.collection('keys').doc(keyHash).delete()
  console.log(`  Deleted keys/${keyHash}`)
}

async function keyRemoveDevice(keyHash: string, deviceId: string): Promise<void> {
  const keyRef = db.collection('keys').doc(keyHash)
  const keyDoc = await keyRef.get()
  if (!keyDoc.exists) {
    console.error(`Key not found: ${keyHash}`)
    process.exit(1)
  }
  await keyRef.update({ devices: FieldValue.arrayRemove(deviceId) })
  console.log(`  Removed ${deviceId} from keys/${keyHash}.devices[]`)

  // デバイス側のregisteredKeyもクリア
  const dRef = db.collection('devices').doc(deviceId)
  const dDoc = await dRef.get()
  if (dDoc.exists && dDoc.data()?.registeredKey === keyHash) {
    await dRef.update({ registeredKey: null, keyHint: null })
    console.log(`  Cleared registeredKey on devices/${deviceId}`)
  }
}

async function keySetMax(keyHash: string, maxDevices: number): Promise<void> {
  const keyRef = db.collection('keys').doc(keyHash)
  const keyDoc = await keyRef.get()
  if (!keyDoc.exists) {
    console.error(`Key not found: ${keyHash}`)
    process.exit(1)
  }
  await keyRef.update({ maxDevices })
  console.log(`  Set maxDevices=${maxDevices} on keys/${keyHash}`)
}

// --- config ---

async function configGet(): Promise<void> {
  const doc = await db.collection('config').doc('current').get()
  if (!doc.exists) {
    console.log('config/current not found. Run: npm run init-firestore')
    return
  }
  console.log('config/current:')
  console.log(JSON.stringify(doc.data(), null, 2))
}

async function configSet(field: string, value: string): Promise<void> {
  const ref = db.collection('config').doc('current')
  // 型推定: 数値っぽければ数値、null なら null、それ以外は文字列
  let parsed: unknown = value
  if (value === 'null') parsed = null
  else if (/^\d+$/.test(value)) parsed = Number(value)

  await ref.update({ [field]: parsed, updatedAt: Timestamp.now() })
  console.log(`  Set config/current.${field} = ${JSON.stringify(parsed)}`)
}

// --- main ---

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2)

  if (!command) {
    console.log('Usage: npx tsx scripts/admin.ts <command> [args...]')
    console.log('')
    console.log('Commands:')
    console.log('  device:get <deviceId>')
    console.log('  device:list')
    console.log('  device:delete <deviceId>')
    console.log('  key:get <downloadKey>          (plain text key)')
    console.log('  key:get-hash <keyHash>         (SHA256 hash)')
    console.log('  key:list')
    console.log('  key:delete <downloadKey>')
    console.log('  key:remove-device <downloadKey> <deviceId>')
    console.log('  key:set-max <downloadKey> <maxDevices>')
    console.log('  config:get')
    console.log('  config:set <field> <value>')
    process.exit(0)
  }

  switch (command) {
    case 'device:get':
      if (!args[0]) { console.error('deviceId required'); process.exit(1) }
      await deviceGet(args[0])
      break
    case 'device:list':
      await deviceList()
      break
    case 'device:delete':
      if (!args[0]) { console.error('deviceId required'); process.exit(1) }
      await deviceDelete(args[0])
      break
    case 'key:get':
      if (!args[0]) { console.error('downloadKey required'); process.exit(1) }
      await keyGet(hashKey(args[0]))
      break
    case 'key:get-hash':
      if (!args[0]) { console.error('keyHash required'); process.exit(1) }
      await keyGet(args[0])
      break
    case 'key:list':
      await keyList()
      break
    case 'key:delete':
      if (!args[0]) { console.error('downloadKey required'); process.exit(1) }
      await keyDelete(hashKey(args[0]))
      break
    case 'key:remove-device':
      if (!args[0] || !args[1]) { console.error('downloadKey and deviceId required'); process.exit(1) }
      await keyRemoveDevice(hashKey(args[0]), args[1])
      break
    case 'key:set-max':
      if (!args[0] || !args[1]) { console.error('downloadKey and maxDevices required'); process.exit(1) }
      await keySetMax(hashKey(args[0]), Number(args[1]))
      break
    case 'config:get':
      await configGet()
      break
    case 'config:set':
      if (!args[0] || args[1] === undefined) { console.error('field and value required'); process.exit(1) }
      await configSet(args[0], args[1])
      break
    default:
      console.error(`Unknown command: ${command}`)
      process.exit(1)
  }

  process.exit(0)
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
