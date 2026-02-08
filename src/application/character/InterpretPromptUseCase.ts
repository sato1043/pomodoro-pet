import type { CharacterStateName } from '../../domain/character/value-objects/CharacterState'

const ACTION_KEYWORDS: Array<{ action: CharacterStateName; keywords: string[] }> = [
  { action: 'wander', keywords: ['walk', 'move', 'go', '歩', '散歩', '移動'] },
  { action: 'sit', keywords: ['sit', 'rest', '座', '休'] },
  { action: 'sleep', keywords: ['sleep', 'nap', '寝', '眠'] },
  { action: 'happy', keywords: ['happy', 'dance', 'joy', '喜', '踊', '嬉'] },
  { action: 'reaction', keywords: ['wave', 'hello', 'hi', '挨拶', '手を振'] },
  { action: 'idle', keywords: ['idle', 'stop', 'stay', '止', '待'] }
]

export function interpretPrompt(text: string): CharacterStateName {
  const normalized = text.toLowerCase().trim()
  if (normalized === '') return 'idle'

  for (const { action, keywords } of ACTION_KEYWORDS) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return action
      }
    }
  }

  return 'idle'
}
