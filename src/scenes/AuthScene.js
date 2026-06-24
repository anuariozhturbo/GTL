import { supabase, getProfile } from '../lib/supabase.js'

const FORM_HTML = `
<style>
  #cc-auth button { transition: box-shadow 0.15s, background 0.15s, color 0.15s, border-color 0.15s; }
  #tab-login:hover, #tab-register:hover {
    background:#5e1e9e !important;
    border-color:#cc88ff !important;
    color:#ffffff !important;
    box-shadow:0 0 14px rgba(155,89,182,0.7);
  }
  #btn-submit:hover {
    background:#7c3aed !important;
    border-color:#cc88ff !important;
    box-shadow:0 0 22px rgba(155,89,182,0.85), 0 0 8px rgba(204,136,255,0.5);
  }
  #btn-google:hover {
    background:#f5f5f5 !important;
    border-color:#aaaaaa !important;
    box-shadow:0 2px 8px rgba(0,0,0,0.18);
  }
  #btn-guest:hover {
    background:#1a0048 !important;
    border-color:#9b59b6 !important;
    color:#cc88ff !important;
    box-shadow:0 0 12px rgba(155,89,182,0.45);
  }
  #cc-auth input::placeholder { color:#4a2070; }
  @media (orientation: landscape) and (max-height: 520px) {
    #cc-auth {
      width:min(340px,calc(100vw - 28px)) !important;
      padding:12px 14px !important;
      max-height:calc(100dvh - 18px) !important;
    }
    #cc-auth .auth-tabs { margin-bottom:10px !important; }
    #cc-auth input { padding:8px 10px !important; margin-bottom:7px !important; }
    #auth-msg { min-height:14px !important; margin-bottom:5px !important; }
    #btn-submit { padding:9px !important; margin-bottom:8px !important; }
    #auth-or { margin-bottom:7px !important; font-size:10px !important; }
    #btn-google { padding:8px !important; margin-bottom:7px !important; font-size:12px !important; }
    #btn-guest { padding:8px !important; font-size:12px !important; }
  }
</style>
<div id="cc-auth" style="
  font-family:'Courier New',monospace;
  background:rgba(3,0,18,0.97);
  border:1.5px solid #4a0e8a;
  border-radius:12px;
  padding:clamp(16px,4vw,28px) clamp(16px,4vw,28px) clamp(14px,3vw,22px);
  width:min(340px,calc(100vw - 32px));
  max-height:calc(100vh - 24px);
  max-height:calc(100dvh - 24px);
  overflow-y:auto;
  box-sizing:border-box;
  box-shadow:0 0 40px rgba(91,15,160,0.35),inset 0 0 30px rgba(20,0,50,0.5);
  color:#e9d5ff;
">
  <div class="auth-tabs" style="display:flex;gap:8px;margin-bottom:20px;">
    <button id="tab-login" style="flex:1;background:#3d0070;border:1px solid #7c3aed;
      color:#e9d5ff;padding:8px 4px;cursor:pointer;font-family:'Courier New',monospace;
      font-size:13px;font-weight:bold;border-radius:6px;letter-spacing:2px;">LOGIN</button>
    <button id="tab-register" style="flex:1;background:#0a0022;border:1px solid #2a0055;
      color:#555;padding:8px 4px;cursor:pointer;font-family:'Courier New',monospace;
      font-size:13px;font-weight:bold;border-radius:6px;letter-spacing:2px;">REGISTER</button>
  </div>
  <input id="field-name" type="text" maxlength="12" placeholder="Display name (max 12 chars)"
    style="display:none;width:100%;box-sizing:border-box;margin-bottom:10px;
    background:#080020;border:1px solid #3d0070;color:#e9d5ff;
    padding:10px 12px;border-radius:6px;font-family:'Courier New',monospace;
    font-size:13px;outline:none;letter-spacing:1px;">
  <input id="field-email" type="email" placeholder="Email address"
    style="width:100%;box-sizing:border-box;margin-bottom:10px;
    background:#080020;border:1px solid #3d0070;color:#e9d5ff;
    padding:10px 12px;border-radius:6px;font-family:'Courier New',monospace;
    font-size:13px;outline:none;letter-spacing:1px;">
  <input id="field-pass" type="password" placeholder="Password"
    style="width:100%;box-sizing:border-box;margin-bottom:8px;
    background:#080020;border:1px solid #3d0070;color:#e9d5ff;
    padding:10px 12px;border-radius:6px;font-family:'Courier New',monospace;
    font-size:13px;outline:none;letter-spacing:1px;">
  <div id="auth-msg" style="font-size:11px;min-height:18px;margin-bottom:8px;
    letter-spacing:1px;text-align:center;color:#ff6b6b;"></div>
  <button id="btn-submit" style="width:100%;background:#3d0070;border:1.5px solid #7c3aed;
    color:#ffffff;padding:12px;cursor:pointer;font-family:'Courier New',monospace;
    font-size:16px;font-weight:bold;border-radius:6px;margin-bottom:14px;
    letter-spacing:3px;">ENTER</button>
  <div id="auth-or" style="text-align:center;color:#2a0050;margin-bottom:12px;font-size:11px;
    letter-spacing:3px;">——  OR  ——</div>
  <button id="btn-google" style="width:100%;background:#ffffff;border:1.5px solid #dddddd;
    color:#333333;padding:11px;cursor:pointer;font-family:'Courier New',monospace;
    font-size:14px;font-weight:bold;border-radius:6px;margin-bottom:10px;
    display:flex;align-items:center;justify-content:center;gap:10px;box-sizing:border-box;">
    <svg width="18" height="18" viewBox="0 0 48 48" style="flex-shrink:0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
    Sign in with Google
  </button>
  <button id="btn-guest" style="width:100%;background:#0a0022;border:1px solid #2a0055;
    color:#666;padding:10px;cursor:pointer;font-family:'Courier New',monospace;
    font-size:13px;border-radius:6px;letter-spacing:2px;">PLAY AS GUEST</button>
</div>`

export default class AuthScene extends Phaser.Scene {
  constructor() { super('AuthScene') }

  create() {
    const W = this.scale.width, H = this.scale.height
    const isMobile = this._isMobileLayout()
    const isPhoneLandscape = this._isPhoneLandscape()
    const titleY = isMobile ? 92 : 148
    const titleSize = isMobile ? '76px' : '122px'
    const subtitleY = isMobile ? 164 : 262
    const subtitleSize = isMobile ? '30px' : '52px'
    this._mode = 'login'
    this._handled = false
    this.scale.once('resize', () => {
      if (!this._handled && this.scene.isActive('AuthScene')) this.scene.restart()
    })

    this._drawBg(W, H)

    if (!isPhoneLandscape) {
      this.add.text(W / 2, titleY, 'CHAOS', {
        fontSize: titleSize, color: '#9b59b6', fontFamily: 'monospace', fontStyle: 'bold',
        stroke: '#2d0060', strokeThickness: 5,
      }).setOrigin(0.5)

      this.add.text(W / 2, subtitleY, 'CONSTRUCT', {
        fontSize: subtitleSize, color: '#e2d9f3', fontFamily: 'monospace', fontStyle: 'bold',
        stroke: '#3d0070', strokeThickness: 3,
      }).setOrigin(0.5)
    }

    this._statusText = this.add.text(W / 2, isMobile ? H / 2 - 20 : H / 2 + 30, 'CHECKING SESSION…', {
      fontSize: '13px', color: '#4a1080', fontFamily: 'monospace', letterSpacing: 3,
    }).setOrigin(0.5)

    // Listen for OAuth redirect returning with a session (PKCE exchange is async)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && !this._handled) {
        this._handled = true
        subscription.unsubscribe()
        this._statusText?.setText('WELCOME BACK')
        await this._onSuccess(session)
      }
    })

    // Resume existing session if available
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session && !this._handled) {
        this._handled = true
        subscription.unsubscribe()
        this._statusText.setText('WELCOME BACK')
        await this._onSuccess(session)
      } else if (!session) {
        this._statusText.destroy()
        this._showForm(W, H, isMobile)
      }
    })
  }

  _isMobileLayout() {
    return window.innerWidth <= 700 || window.innerHeight <= 520
  }

  _isPhoneLandscape() {
    return window.innerWidth > window.innerHeight && window.innerHeight <= 520
  }

  _showForm(W, H, isMobile) {
    this._formEl = this.add.dom(W / 2, isMobile ? H / 2 : H / 2 + 115).createFromHTML(FORM_HTML)

    // Focus-glow on inputs
    const inputs = ['field-email', 'field-pass', 'field-name']
    inputs.forEach(id => {
      const el = this._formEl.getChildByID(id)
      el.addEventListener('focus', () => { el.style.borderColor = '#9b59b6' })
      el.addEventListener('blur',  () => { el.style.borderColor = '#3d0070' })
    })

    this._formEl.addListener('click')
    this._formEl.on('click', e => {
      const id = e.target.id || e.target.closest('button')?.id
      if (id === 'tab-login')         this._switchMode('login')
      else if (id === 'tab-register') this._switchMode('register')
      else if (id === 'btn-submit')   this._submit()
      else if (id === 'btn-google')   this._googleSignIn()
      else if (id === 'btn-guest')    this._guest()
    })

    this._formEl.addListener('keydown')
    this._formEl.on('keydown', e => { if (e.key === 'Enter') this._submit() })
  }

  _switchMode(mode) {
    this._mode = mode
    const nameEl = this._formEl.getChildByID('field-name')
    nameEl.style.display = mode === 'register' ? 'block' : 'none'

    const tl = this._formEl.getChildByID('tab-login')
    const tr = this._formEl.getChildByID('tab-register')
    const active   = 'background:#3d0070;border:1px solid #7c3aed;color:#e9d5ff;'
    const inactive = 'background:#0a0022;border:1px solid #2a0055;color:#555;'

    tl.style.cssText = tl.style.cssText.replace(/background:[^;]+;border:[^;]+;color:[^;]+;/, mode === 'login' ? active : inactive)
    tr.style.cssText = tr.style.cssText.replace(/background:[^;]+;border:[^;]+;color:[^;]+;/, mode === 'register' ? active : inactive)

    this._formEl.getChildByID('auth-msg').textContent = ''
  }

  async _googleSignIn() {
    const btn = this._formEl.getChildByID('btn-google')
    btn.disabled = true
    btn.textContent = 'Redirecting…'
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    // Page will redirect — no further code runs here
  }

  async _submit() {
    const email   = this._formEl.getChildByID('field-email').value.trim()
    const pass    = this._formEl.getChildByID('field-pass').value.trim()
    const nameVal = this._formEl.getChildByID('field-name').value.trim()
    const msgEl   = this._formEl.getChildByID('auth-msg')
    const btn     = this._formEl.getChildByID('btn-submit')

    msgEl.style.color = '#ff6b6b'
    if (!email || !pass) { msgEl.textContent = 'Email and password required'; return }
    if (this._mode === 'register' && !nameVal) { msgEl.textContent = 'Display name required'; return }

    btn.textContent = '···'
    btn.disabled = true

    try {
      if (this._mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) throw error
        await this._onSuccess(data.session)
      } else {
        const displayName = nameVal.toUpperCase().slice(0, 12)
        const { data, error } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { display_name: displayName } },
        })
        if (error) throw error
        if (!data.session) {
          // Email confirmation required
          msgEl.style.color = '#a78bfa'
          msgEl.textContent = 'Check your email to confirm, then log in.'
          btn.textContent = 'ENTER'
          btn.disabled = false
          return
        }
        // Ensure profile has the chosen display name
        await supabase.from('profiles')
          .update({ display_name: displayName })
          .eq('id', data.user.id)
        await this._onSuccess(data.session)
      }
    } catch (e) {
      msgEl.textContent = e.message
      btn.textContent = 'ENTER'
      btn.disabled = false
    }
  }

  async _onSuccess(session) {
    const profile = await getProfile(session.user.id)
    this.registry.set('user', {
      id:             session.user.id,
      email:          session.user.email,
      displayName:    profile?.display_name || session.user.email.split('@')[0].toUpperCase().slice(0, 12),
      isGuest:        false,
      wins:           profile?.wins        || 0,
      losses:         profile?.losses      || 0,
      xp:             profile?.xp          || 0,
      level:          profile?.level       || 1,
      winStreak:      profile?.win_streak  || 0,
      bestStreak:     profile?.best_streak || 0,
      equippedTitle:  profile?.equipped_title || null,
      unlockedTitles: profile?.unlocked_titles || [],
      unlockedChars:  profile?.unlocked_chars || [],
      dailyDate:      profile?.daily_date      || '',
      dailyProgress:  profile?.daily_progress  || 0,
      dailyDone:      profile?.daily_done      || false,
    })
    this.scene.start('MenuScene')
  }

  _guest() {
    this.registry.set('user', {
      id: null, email: null, displayName: 'PLAYER', isGuest: true, wins: 0, losses: 0,
      unlockedChars: [],
    })
    this.scene.start('MenuScene')
  }

  _drawBg(W, H) {
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x01000a, 0x01000a, 0x09001f, 0x09001f, 1)
    bg.fillRect(0, 0, W, H)

    // Nebula blobs
    bg.fillStyle(0x4a1080, 0.10); bg.fillCircle(W / 2, 190, 320)
    bg.fillStyle(0x6b21a8, 0.06); bg.fillCircle(W / 2, 190, 200)
    bg.fillStyle(0x7c3aed, 0.04); bg.fillCircle(W * 0.2, H * 0.7, 180)
    bg.fillStyle(0x3b0f6e, 0.07); bg.fillCircle(W * 0.8, H * 0.3, 160)

    // Horizon glow
    bg.fillStyle(0x4a1080, 0.10)
    bg.fillRect(0, H / 2 - 40, W, 80)
    bg.lineStyle(1, 0x4a1080, 0.35)
    bg.lineBetween(0, H / 2 - 40, W, H / 2 - 40)
    bg.lineBetween(0, H / 2 + 40, W, H / 2 + 40)

    // Sparse stars
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, W)
      const sy = Phaser.Math.Between(0, H)
      const alpha = Phaser.Math.FloatBetween(0.2, 0.7)
      bg.fillStyle(0xffffff, alpha)
      bg.fillRect(sx, sy, 1, 1)
    }
  }
}
