/**
 * MP3等の音声ファイルをワンショット再生するプレイヤー。
 * Web Audio API の AudioContext + decodeAudioData を使用。
 * バッファキャッシュにより同一URLの2回目以降は即時再生。
 */

export interface SfxPlayer {
  play(url: string): Promise<void>
  setVolume(volume: number): void
  setMuted(muted: boolean): void
  dispose(): void
}

export function createSfxPlayer(): SfxPlayer {
  let ctx: AudioContext | null = null
  let gainNode: GainNode | null = null
  let volume = 0.8
  let muted = false
  const bufferCache = new Map<string, AudioBuffer>()

  function ensureContext(): { ctx: AudioContext; gainNode: GainNode } {
    if (!ctx) {
      ctx = new AudioContext()
      gainNode = ctx.createGain()
      gainNode.gain.value = muted ? 0 : volume
      gainNode.connect(ctx.destination)
    }
    return { ctx, gainNode: gainNode! }
  }

  async function loadBuffer(audioCtx: AudioContext, url: string): Promise<AudioBuffer> {
    const cached = bufferCache.get(url)
    if (cached) return cached

    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    bufferCache.set(url, audioBuffer)
    return audioBuffer
  }

  return {
    async play(url: string): Promise<void> {
      const { ctx: audioCtx, gainNode: gain } = ensureContext()
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume()
      }
      const buffer = await loadBuffer(audioCtx, url)
      const source = audioCtx.createBufferSource()
      source.buffer = buffer
      source.connect(gain)
      source.start()
    },

    setVolume(v: number): void {
      volume = Math.max(0, Math.min(1, v))
      if (gainNode && ctx && !muted) {
        gainNode.gain.setTargetAtTime(volume, ctx.currentTime, 0.05)
      }
    },

    setMuted(m: boolean): void {
      muted = m
      if (gainNode && ctx) {
        gainNode.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.05)
      }
    },

    dispose(): void {
      bufferCache.clear()
      if (ctx) {
        ctx.close()
        ctx = null
        gainNode = null
      }
    }
  }
}
