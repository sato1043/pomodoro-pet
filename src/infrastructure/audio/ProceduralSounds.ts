/**
 * Web Audio APIを使ったプロシージャル環境音生成。
 * 外部音声ファイル不要で動作する。
 */

export type SoundPreset = 'rain' | 'forest' | 'wind' | 'silence'

export interface SoundPresetConfig {
  readonly name: SoundPreset
  readonly label: string
  readonly build: (ctx: AudioContext, destination: AudioNode) => AudioNode[]
}

function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * durationSec
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function buildRain(ctx: AudioContext, destination: AudioNode): AudioNode[] {
  const nodes: AudioNode[] = []

  // ホワイトノイズ → バンドパスフィルタで雨の質感
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = createNoiseBuffer(ctx, 4)
  noiseSource.loop = true
  nodes.push(noiseSource)

  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 8000
  bandpass.Q.value = 0.5
  nodes.push(bandpass)

  const gain = ctx.createGain()
  gain.gain.value = 0.15
  nodes.push(gain)

  noiseSource.connect(bandpass)
  bandpass.connect(gain)
  gain.connect(destination)
  noiseSource.start()

  // 低周波のゴロゴロ音（遠雷）
  const rumbleSource = ctx.createBufferSource()
  rumbleSource.buffer = createNoiseBuffer(ctx, 4)
  rumbleSource.loop = true
  nodes.push(rumbleSource)

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 200
  nodes.push(lowpass)

  const rumbleGain = ctx.createGain()
  rumbleGain.gain.value = 0.05
  nodes.push(rumbleGain)

  rumbleSource.connect(lowpass)
  lowpass.connect(rumbleGain)
  rumbleGain.connect(destination)
  rumbleSource.start()

  return nodes
}

function buildForest(ctx: AudioContext, destination: AudioNode): AudioNode[] {
  const nodes: AudioNode[] = []

  // 風のベース音
  const windSource = ctx.createBufferSource()
  windSource.buffer = createNoiseBuffer(ctx, 4)
  windSource.loop = true
  nodes.push(windSource)

  const windFilter = ctx.createBiquadFilter()
  windFilter.type = 'lowpass'
  windFilter.frequency.value = 600
  windFilter.Q.value = 1.0
  nodes.push(windFilter)

  const windGain = ctx.createGain()
  windGain.gain.value = 0.08
  nodes.push(windGain)

  windSource.connect(windFilter)
  windFilter.connect(windGain)
  windGain.connect(destination)
  windSource.start()

  // 鳥のさえずり風の高音トーン（複数）
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 2000 + i * 800
    nodes.push(osc)

    // LFOでトリル（震え）を表現
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 4 + i * 2
    nodes.push(lfo)

    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 100 + i * 50
    nodes.push(lfoGain)

    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)

    // 断続的に鳴らすためのAMを使用
    const amLfo = ctx.createOscillator()
    amLfo.frequency.value = 0.15 + i * 0.1
    nodes.push(amLfo)

    const amGain = ctx.createGain()
    amGain.gain.value = 0.012
    nodes.push(amGain)

    const birdGain = ctx.createGain()
    birdGain.gain.value = 0
    nodes.push(birdGain)

    amLfo.connect(birdGain.gain)
    osc.connect(birdGain)
    birdGain.connect(amGain)
    amGain.connect(destination)

    osc.start(ctx.currentTime + i * 1.5)
    lfo.start(ctx.currentTime + i * 1.5)
    amLfo.start(ctx.currentTime + i * 1.5)
  }

  return nodes
}

function buildWind(ctx: AudioContext, destination: AudioNode): AudioNode[] {
  const nodes: AudioNode[] = []

  const source = ctx.createBufferSource()
  source.buffer = createNoiseBuffer(ctx, 4)
  source.loop = true
  nodes.push(source)

  // ゆっくり変動するローパスフィルタで風の揺らぎ
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 400
  filter.Q.value = 2.0
  nodes.push(filter)

  // LFOでフィルタ周波数を揺らす
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.2
  nodes.push(lfo)

  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 300
  nodes.push(lfoGain)

  lfo.connect(lfoGain)
  lfoGain.connect(filter.frequency)

  const gain = ctx.createGain()
  gain.gain.value = 0.12
  nodes.push(gain)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(destination)

  source.start()
  lfo.start()

  return nodes
}

export const SOUND_PRESETS: SoundPresetConfig[] = [
  { name: 'rain', label: 'Rain', build: buildRain },
  { name: 'forest', label: 'Forest', build: buildForest },
  { name: 'wind', label: 'Wind', build: buildWind },
  { name: 'silence', label: 'Silence', build: () => [] }
]
