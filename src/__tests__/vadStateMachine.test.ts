import { describe, it, expect } from 'vitest'
import { transition } from '@/lib/audioState'

describe('VAD state machine integration', () => {
  it('idle transitions to recording on START_RECORDING', () => {
    expect(transition('idle', 'START_RECORDING')).toBe('recording')
  })

  it('recording transitions to processing on STOP_RECORDING', () => {
    expect(transition('recording', 'STOP_RECORDING')).toBe('processing')
  })

  it('processing transitions to playing on RESPONSE_RECEIVED', () => {
    expect(transition('processing', 'RESPONSE_RECEIVED')).toBe('playing')
  })

  it('playing transitions to say-it-back on SAY_IT_BACK_TRIGGERED', () => {
    expect(transition('playing', 'SAY_IT_BACK_TRIGGERED')).toBe('say-it-back')
  })

  it('say-it-back transitions to recording on START_RECORDING', () => {
    expect(transition('say-it-back', 'START_RECORDING')).toBe('recording')
  })

  it('RESET returns to idle from any state', () => {
    expect(transition('recording', 'RESET')).toBe('idle')
    expect(transition('processing', 'RESET')).toBe('idle')
    expect(transition('playing', 'RESET')).toBe('idle')
    expect(transition('say-it-back', 'RESET')).toBe('idle')
  })

  it('idle stays idle on invalid event', () => {
    // PLAYBACK_STARTED is valid from processing, but idle stays idle
    expect(transition('idle', 'PLAYBACK_STARTED')).toBe('idle')
  })
})
