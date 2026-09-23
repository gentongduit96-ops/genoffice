export interface VoiceDictationOptions {
  language?: 'ar-SA' | 'id-ID' | 'ar-EG'
  onResult?: (text: string, isFinal: boolean) => void
  onCommand?: (command: 'verified' | 'flagged' | 'next' | 'prev') => void
  onError?: (error: string) => void
  onEnd?: () => void
}

class VoiceDictationService {
  private recognition: any = null
  private isListening: boolean = false
  private currentLanguage: string = 'ar-SA'

  public isSupported(): boolean {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  }

  public start(options: VoiceDictationOptions = {}): boolean {
    if (this.isListening) {
      this.stop()
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionClass) {
      options.onError?.('Web Speech API is not supported in this environment.')
      return false
    }

    try {
      this.recognition = new SpeechRecognitionClass()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = options.language || this.currentLanguage

      this.recognition.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript.trim()
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '

            // Check for voice navigation commands
            const lower = transcript.toLowerCase()
            if (lower.includes('صحيح') || lower.includes('صح') || lower.includes('shahih') || lower.includes('verified')) {
              options.onCommand?.('verified')
            } else if (lower.includes('راغب') || lower.includes('شَكّ') || lower.includes('ragu') || lower.includes('flag')) {
              options.onCommand?.('flagged')
            } else if (lower.includes('التالي') || lower.includes('lanjut') || lower.includes('next')) {
              options.onCommand?.('next')
            } else if (lower.includes('السابق') || lower.includes('kembali') || lower.includes('prev')) {
              options.onCommand?.('prev')
            }
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          options.onResult?.(finalTranscript.trim(), true)
        } else if (interimTranscript) {
          options.onResult?.(interimTranscript.trim(), false)
        }
      }

      this.recognition.onerror = (event: any) => {
        console.warn('[VoiceDictation] Error:', event.error)
        options.onError?.(event.error)
      }

      this.recognition.onend = () => {
        this.isListening = false
        options.onEnd?.()
      }

      this.recognition.start()
      this.isListening = true
      return true
    } catch (err: any) {
      console.error('[VoiceDictation] Failed to start:', err)
      options.onError?.(err?.message || 'Failed to start speech recognition')
      return false
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop()
      } catch {}
      this.isListening = false
    }
  }

  public setLanguage(lang: 'ar-SA' | 'id-ID' | 'ar-EG'): void {
    this.currentLanguage = lang
    if (this.recognition && this.isListening) {
      this.recognition.lang = lang
    }
  }

  public getIsListening(): boolean {
    return this.isListening
  }
}

export const voiceDictationService = new VoiceDictationService()
