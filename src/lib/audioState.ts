export type AudioState = 'idle' | 'recording' | 'processing' | 'playing' | 'say-it-back'

export type AudioEvent =
  | 'START_RECORDING'
  | 'STOP_RECORDING'
  | 'TRANSCRIPT_RECEIVED'
  | 'RESPONSE_RECEIVED'
  | 'PLAYBACK_STARTED'
  | 'PLAYBACK_ENDED'
  | 'SAY_IT_BACK_TRIGGERED'
  | 'RESET'

export const AUDIO_TRANSITIONS: Record<AudioState, Partial<Record<AudioEvent, AudioState>>> = {
  idle: {
    START_RECORDING: 'recording',
  },
  recording: {
    STOP_RECORDING: 'processing',
    RESET: 'idle',
  },
  processing: {
    RESPONSE_RECEIVED: 'playing',
    RESET: 'idle',
  },
  playing: {
    PLAYBACK_ENDED: 'idle',
    SAY_IT_BACK_TRIGGERED: 'say-it-back',
    RESET: 'idle',
  },
  'say-it-back': {
    START_RECORDING: 'recording',
    RESET: 'idle',
  },
}

export function transition(state: AudioState, event: AudioEvent): AudioState {
  return AUDIO_TRANSITIONS[state]?.[event] ?? state
}
