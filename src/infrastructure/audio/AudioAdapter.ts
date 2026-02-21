import { SOUND_PRESETS, type SoundPreset } from './ProceduralSounds'

export interface AudioAdapter {
  readonly currentPreset: SoundPreset
  readonly volume: number
  readonly isMuted: boolean
  switchPreset(preset: SoundPreset): void
  setVolume(volume: number): void
  toggleMute(): void
  setBackgroundMuted(muted: boolean): void
  resume(): Promise<void>
  dispose(): void
}

const MAX_GAIN = 0.25

export function createAudioAdapter(): AudioAdapter {
  let ctx: AudioContext | null = null
  let masterGain: GainNode | null = null
  let activeNodes: AudioNode[] = []
  let currentPreset: SoundPreset = 'silence'
  let volume = 0
  let isMuted = true
  let backgroundMuted = false

  function ensureContext(): { ctx: AudioContext; masterGain: GainNode } {
    if (!ctx) {
      ctx = new AudioContext()
      masterGain = ctx.createGain()
      masterGain.gain.value = volume * MAX_GAIN
      masterGain.connect(ctx.destination)
    }
    return { ctx, masterGain: masterGain! }
  }

  function updateSuspendState(): void {
    if (!ctx) return
    if (isMuted || backgroundMuted) {
      if (masterGain) {
        masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1)
      }
      if (ctx.state === 'running') {
        ctx.suspend()
      }
    } else {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          if (masterGain && ctx) {
            masterGain.gain.setTargetAtTime(volume * MAX_GAIN, ctx.currentTime, 0.1)
          }
        })
      }
    }
  }

  function stopActiveNodes(): void {
    for (const node of activeNodes) {
      try {
        if (node instanceof AudioBufferSourceNode) node.stop()
        else if (node instanceof OscillatorNode) node.stop()
        node.disconnect()
      } catch {
        // 既に停止/切断済み
      }
    }
    activeNodes = []
  }

  return {
    get currentPreset() { return currentPreset },
    get volume() { return volume },
    get isMuted() { return isMuted },

    switchPreset(preset: SoundPreset): void {
      const { ctx: audioCtx, masterGain: gain } = ensureContext()
      stopActiveNodes()
      currentPreset = preset

      const config = SOUND_PRESETS.find(p => p.name === preset)
      if (config) {
        activeNodes = config.build(audioCtx, gain)
      }

      // ミュート中またはバックグラウンドミュート中はAudioContextを休止し、システムリソースを解放する
      if ((isMuted || backgroundMuted) && audioCtx.state === 'running') {
        audioCtx.suspend()
      }
    },

    setVolume(v: number): void {
      volume = Math.max(0, Math.min(1, v))
      if (masterGain && !isMuted) {
        masterGain.gain.setTargetAtTime(volume * MAX_GAIN, ctx!.currentTime, 0.1)
      }
    },

    toggleMute(): void {
      isMuted = !isMuted
      updateSuspendState()
    },

    setBackgroundMuted(muted: boolean): void {
      backgroundMuted = muted
      updateSuspendState()
    },

    async resume(): Promise<void> {
      // ミュート中またはバックグラウンドミュート中はautoplay policy解除でもAudioContextを復帰させない
      if (ctx && ctx.state === 'suspended' && !isMuted && !backgroundMuted) {
        await ctx.resume()
      }
    },

    dispose(): void {
      stopActiveNodes()
      if (ctx) {
        ctx.close()
        ctx = null
        masterGain = null
      }
    }
  }
}
