import { describe, expect, it } from 'vitest'
import { IDML_CHANNELS } from '../src/shared/ipc.js'

describe('IDML Module IPC Channel Definitions', () => {
  it('defines unique idml:* channel names', () => {
    expect(IDML_CHANNELS.READ_FILE).toBe('idml:read-file')
    expect(IDML_CHANNELS.SAVE).toBe('idml:save')
    expect(IDML_CHANNELS.DIRTY_CHANGED).toBe('idml:dirty-changed')
  })
})
