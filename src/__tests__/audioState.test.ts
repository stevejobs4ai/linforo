import { describe, it, expect } from 'vitest'
import { transition, AudioState } from '@/lib/audioState'

describe('audioState', () => {
  it('transitions from idle to recording on START_RECORDING', () => {
    expect(transition('idle', 'START_RECORDING')).toBe('recording')
  })

  it('transitions from recording to processing on STOP_RECORDING', () => {
    expect(transition('recording', 'STOP_RECORDING')).toBe('processing')
  })

  it('transitions from processing to playing on RESPONSE_RECEIVED', () => {
    expect(transition('processing', 'RESPONSE_RECEIVED')).toBe('playing')
  })

  it('transitions from playing to idle on PLAYBACK_ENDED', () => {
    expect(transition('playing', 'PLAYBACK_ENDED')).toBe('idle')
  })

  it('transitions from playing to say-it-back on SAY_IT_BACK_TRIGGERED', () => {
    expect(transition('playing', 'SAY_IT_BACK_TRIGGERED')).toBe('say-it-back')
  })

  it('RESET from any state returns idle', () => {
    const states: AudioState[] = ['recording', 'processing', 'playing', 'say-it-back']
    for (const state of states) {
      expect(transition(state, 'RESET')).toBe('idle')
    }
  })

  it('invalid transition returns same state', () => {
    expect(transition('idle', 'STOP_RECORDING')).toBe('idle')
  })
})
