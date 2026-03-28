export type HapticIntent = 'confirm' | 'selection'

export interface HapticsAdapter {
  trigger(intent: HapticIntent): void
}

class WebHapticsAdapter implements HapticsAdapter {
  trigger(intent: HapticIntent) {
    if (!('vibrate' in navigator)) {
      return
    }

    if (intent === 'confirm') {
      navigator.vibrate?.([18, 22, 18])
      return
    }

    navigator.vibrate?.(10)
  }
}

export const haptics: HapticsAdapter = new WebHapticsAdapter()
