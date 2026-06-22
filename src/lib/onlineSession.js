// Module-level singleton holding the active online match state.
// Stored here (not in scene data) so it survives scene transitions.
export const onlineSession = {
  active:             false,
  channel:            null,  // Supabase Realtime channel for the game room
  roomId:             null,
  isP1:               false,
  remoteDisplayName:  '',
}

export function clearOnlineSession() {
  try { onlineSession.channel?.unsubscribe() } catch (_) {}
  onlineSession.active            = false
  onlineSession.channel           = null
  onlineSession.roomId            = null
  onlineSession.isP1              = false
  onlineSession.remoteDisplayName = ''
}
