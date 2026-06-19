import { createClient } from '@supabase/supabase-js'

const URL  = import.meta.env.VITE_SUPABASE_URL
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(URL, ANON)

export async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function ensureProfile(userId, displayName) {
  const { data } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: displayName }, { onConflict: 'id', ignoreDuplicates: true })
    .select()
    .single()
  return data
}

// Fire-and-forget stat increment — safe against race conditions via SQL function
export async function recordMatch(userId, won) {
  if (!userId) return
  await supabase.rpc('increment_user_stat', {
    uid: userId,
    stat_name: won ? 'wins' : 'losses',
  })
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getUnlockedChars(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('unlocked_chars')
    .eq('id', userId)
    .single()
  return data?.unlocked_chars || []
}

export async function unlockCharacter(userId, charKey) {
  await supabase.rpc('unlock_character', { uid: userId, char_key: charKey })
}

export async function updateDisplayName(userId, name) {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: name })
    .eq('id', userId)
  return error
}
