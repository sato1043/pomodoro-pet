/**
 * MP3等の音声ファイルをワンショット再生・ループ再生するプレイヤー。
 * Web Audio API の AudioContext + decodeAudioData を使用。
 * バッファキャッシュにより同一URLの2回目以降は即時再生。
 * crossfadeMs指定時はループ境界・曲間切替でクロスフェード。
 */

export interface SfxPlayer {
  play(url: string, gain?: number): Promise<void>
  playLoop(url: string, crossfadeMs?: number, gain?: number): Promise<void>
  stop(): void
  setVolume(volume: number): void
  setMuted(muted: boolean): void
  dispose(): void
}

const MAX_GAIN = 0.25

interface LoopSlot {
  source: AudioBufferSourceNode
  gain: GainNode
}

interface PendingFadeout extends LoopSlot {
  timer: ReturnType<typeof setTimeout>
}

export function createSfxPlayer(): SfxPlayer {
  let ctx: AudioContext | null = null
  let gainNode: GainNode | null = null
  let volume = 0.8
  let muted = false
  const bufferCache = new Map<string, AudioBuffer>()

  // Simple loop (crossfadeMs = 0)
  let currentLoopSource: AudioBufferSourceNode | null = null

  // Crossfade loop (crossfadeMs > 0)
  let activeSlots: LoopSlot[] = []
  let pendingFadeouts: PendingFadeout[] = []
  let loopTimer: ReturnType<typeof setTimeout> | null = null

  function ensureContext(): { ctx: AudioContext; gainNode: GainNode } {
    if (!ctx) {
      ctx = new AudioContext()
      gainNode = ctx.createGain()
      gainNode.gain.value = muted ? 0 : volume * MAX_GAIN
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

  function clearLoopTimer(): void {
    if (loopTimer !== null) {
      clearTimeout(loopTimer)
      loopTimer = null
    }
  }

  function fadeOutSlot(slot: LoopSlot, fadeMs: number, audioCtx: AudioContext): void {
    const endTime = audioCtx.currentTime + fadeMs / 1000
    slot.gain.gain.setValueAtTime(slot.gain.gain.value, audioCtx.currentTime)
    slot.gain.gain.linearRampToValueAtTime(0, endTime)
    const timer = setTimeout(() => {
      try { slot.source.stop(); slot.source.disconnect() } catch { /* 停止済み */ }
      try { slot.gain.disconnect() } catch { /* 切断済み */ }
      pendingFadeouts = pendingFadeouts.filter(p => p.timer !== timer)
    }, fadeMs + 100)
    pendingFadeouts.push({ ...slot, timer })
  }

  function startSlot(
    buffer: AudioBuffer,
    audioCtx: AudioContext,
    masterGain: GainNode,
    fadeInMs: number,
    sourceGainValue: number
  ): LoopSlot {
    const source = audioCtx.createBufferSource()
    source.buffer = buffer
    const sourceGain = audioCtx.createGain()
    if (fadeInMs > 0) {
      sourceGain.gain.setValueAtTime(0, audioCtx.currentTime)
      sourceGain.gain.linearRampToValueAtTime(sourceGainValue, audioCtx.currentTime + fadeInMs / 1000)
    } else {
      sourceGain.gain.value = sourceGainValue
    }
    source.connect(sourceGain)
    sourceGain.connect(masterGain)
    source.start()
    return { source, gain: sourceGain }
  }

  function scheduleNextLoop(
    buffer: AudioBuffer,
    audioCtx: AudioContext,
    masterGain: GainNode,
    crossfadeMs: number,
    sourceGainValue: number
  ): void {
    const scheduleAfterMs = buffer.duration * 1000 - crossfadeMs
    if (scheduleAfterMs <= 0) return // バッファがクロスフェードより短い場合はスキップ

    loopTimer = setTimeout(() => {
      for (const slot of activeSlots) {
        fadeOutSlot(slot, crossfadeMs, audioCtx)
      }
      const newSlot = startSlot(buffer, audioCtx, masterGain, crossfadeMs, sourceGainValue)
      activeSlots = [newSlot]
      scheduleNextLoop(buffer, audioCtx, masterGain, crossfadeMs, sourceGainValue)
    }, scheduleAfterMs)
  }

  function stopSimpleLoop(): void {
    if (currentLoopSource) {
      try { currentLoopSource.stop(); currentLoopSource.disconnect() } catch { /* 停止済み */ }
      currentLoopSource = null
    }
  }

  function stopCrossfadeLoop(): void {
    clearLoopTimer()
    for (const slot of activeSlots) {
      try { slot.source.stop(); slot.source.disconnect() } catch { /* 停止済み */ }
      try { slot.gain.disconnect() } catch { /* 切断済み */ }
    }
    activeSlots = []
    for (const p of pendingFadeouts) {
      clearTimeout(p.timer)
      try { p.source.stop(); p.source.disconnect() } catch { /* 停止済み */ }
      try { p.gain.disconnect() } catch { /* 切断済み */ }
    }
    pendingFadeouts = []
  }

  return {
    async play(url: string, gain = 1.0): Promise<void> {
      if (muted) return

      const { ctx: audioCtx, gainNode: masterGain } = ensureContext()
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume()
      }
      const buffer = await loadBuffer(audioCtx, url)
      const source = audioCtx.createBufferSource()
      source.buffer = buffer
      if (gain < 1.0) {
        const sourceGain = audioCtx.createGain()
        sourceGain.gain.value = Math.max(0, gain)
        source.connect(sourceGain)
        sourceGain.connect(masterGain)
      } else {
        source.connect(masterGain)
      }
      source.start()
    },

    async playLoop(url: string, crossfadeMs = 0, gain = 1.0): Promise<void> {
      if (muted) return

      const { ctx: audioCtx, gainNode: masterGain } = ensureContext()
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume()
      }
      const buffer = await loadBuffer(audioCtx, url)
      const g = Math.max(0, gain)

      if (crossfadeMs <= 0) {
        // Simple loop（クロスフェードなし）
        this.stop()
        const source = audioCtx.createBufferSource()
        source.buffer = buffer
        source.loop = true
        if (g < 1.0) {
          const sourceGain = audioCtx.createGain()
          sourceGain.gain.value = g
          source.connect(sourceGain)
          sourceGain.connect(masterGain)
        } else {
          source.connect(masterGain)
        }
        source.start()
        currentLoopSource = source
      } else {
        // Crossfade loop
        const hadActiveSlots = activeSlots.length > 0
        for (const slot of activeSlots) {
          fadeOutSlot(slot, crossfadeMs, audioCtx)
        }
        stopSimpleLoop()
        clearLoopTimer()

        const newSlot = startSlot(buffer, audioCtx, masterGain, hadActiveSlots ? crossfadeMs : 0, g)
        activeSlots = [newSlot]
        scheduleNextLoop(buffer, audioCtx, masterGain, crossfadeMs, g)
      }
    },

    stop(): void {
      stopSimpleLoop()
      stopCrossfadeLoop()
    },

    setVolume(v: number): void {
      volume = Math.max(0, Math.min(1, v))
      if (gainNode && ctx && !muted) {
        gainNode.gain.setTargetAtTime(volume * MAX_GAIN, ctx.currentTime, 0.05)
      }
    },

    setMuted(m: boolean): void {
      muted = m
      if (!ctx) return

      if (muted) {
        stopSimpleLoop()
        stopCrossfadeLoop()
        if (gainNode) {
          gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
        }
        ctx.suspend()
      } else {
        ctx.resume().then(() => {
          if (gainNode && ctx) {
            gainNode.gain.setTargetAtTime(volume * MAX_GAIN, ctx.currentTime, 0.05)
          }
        })
      }
    },

    dispose(): void {
      this.stop()
      bufferCache.clear()
      if (ctx) {
        ctx.close()
        ctx = null
        gainNode = null
      }
    }
  }
}
