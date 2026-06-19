export default class Fighter extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, key, config) {
    super(scene, x, y, key + '_idle')
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.scene = scene
    this.key = key
    this.cfg = config
    this.opponent = null

    this.hp = config.maxHp
    this.maxHp = config.maxHp
    this.facing = 1
    this.state = 'idle'
    this.isBlocking = false
    this.isGrounded = true
    this.attackCooldown = 0
    this.specialCooldown = 0
    this.stunTimer = 0
    this.hurtTimer = 0
    this.attackLocked = false   // true during active attack window

    this.setupUnique()

    this.setCollideWorldBounds(true)
    this.body.setGravityY(0)
    this.setSize(52, 88)
    this.setOffset(6, 4)
    this.setDepth(1)

    this.shield = scene.add.image(x, y, 'shield').setDepth(2).setVisible(false)
    this.stunStars = []
    this.flashTimer = 0
    this.wasGrounded = true

    // Foot-glow ellipse (subtle shadow under feet)
    const AURA_COLORS = { ash: 0x9b59b6, merrs: 0x60a5fa, dice: 0xf59e0b, thragg: 0xef4444 }
    const auraColor = AURA_COLORS[key] || 0x9b59b6
    this._aura = scene.add.ellipse(x, y + 38, 64, 10, auraColor, 0.28).setDepth(0)
    this._startAuraTween()

    // Start idle animation (frame 0 fallback if anims not ready yet)
    this.setFrame(0)
  }

  _startAuraTween() {
    this.scene.tweens.killTweensOf(this._aura)
    this._aura.setAlpha(0.18).setScale(0.9)
    this.scene.tweens.add({
      targets: this._aura,
      alpha: { from: 0.18, to: 0.38 },
      scaleX: { from: 0.9, to: 1.15 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    })
  }

  setupUnique() {}

  // ── Input ─────────────────────────────────────────────────────────
  handleInput(cursors) {
    if (this.stunTimer > 0 || this.hurtTimer > 0 || this.state === 'dead') return
    // Don't accept new input during attack or special
    if (this.attackLocked) return

    const onGround = this.body.blocked.down
    this.isGrounded = onGround

    // Block (only on ground)
    if (cursors.block.isDown && onGround) {
      this.setBlocking(true)
      return
    }
    this.setBlocking(false)

    // Special
    if (Phaser.Input.Keyboard.JustDown(cursors.special)) {
      this.useSpecial()
      return
    }

    // Attack
    if (Phaser.Input.Keyboard.JustDown(cursors.attack) && this.attackCooldown <= 0) {
      this.doAttack()
      return
    }

    // Jump
    if (Phaser.Input.Keyboard.JustDown(cursors.up) && onGround) {
      this.doJump()
    }

    // Walk (only when not in locked states)
    if (this.state !== 'attack' && this.state !== 'special') {
      if (cursors.left.isDown) {
        this.setVelocityX(-this.cfg.speed)
        this.setState('walk')
        this.setFacing(-1)
      } else if (cursors.right.isDown) {
        this.setVelocityX(this.cfg.speed)
        this.setState('walk')
        this.setFacing(1)
      } else if (onGround) {
        this.setVelocityX(0)
        this.setState('idle')
      }
    }
  }

  // ── Actions ───────────────────────────────────────────────────────
  doJump(force) {
    this.setVelocityY(-(force || this.cfg.jumpForce))
    this.setState('jump')
  }

  doAttack() {
    this.setState('attack')
    this.attackLocked = true
    this.attackCooldown = this.cfg.attackCooldown
    this.setVelocityX(0)

    this.scene.tweens.killTweensOf(this)
    this.setScale(1)
    this.scene.tweens.add({
      targets: this, scaleX: 1.14,
      duration: 50, yoyo: true, ease: 'Back.Out',
    })

    // Lunge slightly toward opponent
    if (this.opponent) {
      const dir = this.opponent.x > this.x ? 1 : -1
      this.setVelocityX(dir * 180)
    }

    // Flash tint — shows an attack is happening
    this.setTint(0xffffff)
    this.scene.time.delayedCall(80, () => this.clearTint())

    // Hit window at 150ms
    this.scene.time.delayedCall(150, () => this.checkHit())

    // Unlock at 380ms
    this.scene.time.delayedCall(380, () => {
      this.attackLocked = false
      this.setVelocityX(0)
      if (this.state === 'attack') this.setState('idle')
    })
  }

  checkHit() {
    if (!this.opponent || this.opponent.state === 'dead') return
    const dist = this.distToOpponent
    if (dist < this.cfg.attackRange) {
      this.dealDamage(this.cfg.attackDamage, true)
    }
  }

  dealDamage(amount, isBlockable = true) {
    if (!this.opponent) return
    this.opponent.takeDamage(amount, isBlockable, this)
  }

  takeDamage(amount, isBlockable, attacker) {
    if (this.state === 'dead') return

    const blocked = isBlockable && this.isBlocking

    // Hitstop: freeze both fighters' animations briefly
    this.anims.pause()
    if (attacker?.anims) attacker.anims.pause()
    const stopDur = blocked ? 50 : 75
    this.scene.time.delayedCall(stopDur, () => {
      if (this.active && this.state !== 'dead') this.anims.resume()
      if (attacker?.active && attacker.state !== 'dead') attacker.anims.resume()
    })

    if (blocked) {
      amount *= 0.2
      // Shield flash gold
      this.shield.setTint(0xffd700)
      this.scene.time.delayedCall(100, () => this.shield.clearTint())
      this.scene.spawnHitSpark(this.shield.x, this.shield.y, true)
      this.scene.spawnBlockRipple?.(this.shield.x, this.shield.y)
    } else {
      // Red flash on the hit fighter
      this.setTint(0xff3333)
      this.scene.time.delayedCall(120, () => this.clearTint())
      this.scene.spawnHitSpark(this.x, this.y - 50, false)
      this.hurtTimer = 280
      this.attackLocked = false
      this.setState('hurt')
      this.scene.tweens.killTweensOf(this)
      this.setScale(1)
      this.scene.tweens.add({
        targets: this, scaleX: 1.22,
        duration: 45, yoyo: true, ease: 'Quad.Out',
      })
      const dir = attacker ? (this.x > attacker.x ? 1 : -1) : (this.facing * -1)
      this.setVelocityX(dir * 320)
      this.scene.time.delayedCall(280, () => {
        if (this.state === 'hurt') {
          this.setState('idle')
          this.setVelocityX(0)
        }
      })
    }

    this.hp = Math.max(0, this.hp - amount)
    this.scene.events.emit('hpChanged', this)
    if (this.hp <= 0) this.die()
  }

  applyStun(duration) {
    if (this.state === 'dead') return
    this.stunTimer = duration
    this.attackLocked = false
    this.setState('hurt')
    this.setVelocityX(0)
    this.spawnStunStars()
  }

  applyBurn(amount) {
    if (this.state === 'dead') return
    this.hp = Math.max(0, this.hp - amount)
    this.scene.events.emit('hpChanged', this)
    this.scene.spawnBurnEffect(this.x, this.y - 30)
    if (this.hp <= 0) this.die()
  }

  useSpecial() {
    if (this.specialCooldown > 0) return
    this.doSpecial()
  }

  doSpecial() {}

  setBlocking(val) {
    this.isBlocking = val
    this.shield.setVisible(val)
    if (val) {
      this.setState('block')
      this.setVelocityX(0)
    } else if (this.state === 'block') {
      this.setState('idle')
    }
  }

  setFacing(dir) {
    this.facing = dir
    this.setFlipX(dir === -1)
    this.updateShieldPosition()
  }

  faceOpponent() {
    if (!this.opponent) return
    this.setFacing(this.opponent.x > this.x ? 1 : -1)
  }

  setState(newState) {
    if (this.state === newState || this.state === 'dead') return
    this.state = newState
    this.playAnim(newState)
  }

  playAnim(state) {
    const animKey = `${this.key}_${state}`
    if (this.scene.anims.exists(animKey)) {
      this.play(animKey, true)
    }
  }

  die() {
    if (this.state === 'dead') return
    this.setState('dead')
    this.attackLocked = false
    this.setVelocityX(0)
    this.setTint(0x880000)
    if (this._aura) { this.scene.tweens.killTweensOf(this._aura); this._aura.setAlpha(0) }
    this.scene.spawnKOEffect?.(this.x, this.y - 40)
    this.scene.events.emit('fighterDead', this)
  }

  respawn(x) {
    this.scene.tweens.killTweensOf(this)
    this.setScale(1)
    this.hp = this.maxHp
    this.state = 'idle'
    this.stunTimer = 0
    this.hurtTimer = 0
    this.attackCooldown = 0
    this.specialCooldown = 0
    this.attackLocked = false
    this.isBlocking = false
    this.wasGrounded = true
    this.shield.setVisible(false)
    this.clearTint()
    this.clearStunStars()
    this.setPosition(x, 450)
    this.setVelocity(0, 0)
    this.resetUnique()
    this.playAnim('idle')
    if (this._aura) this._startAuraTween()
    this.scene.events.emit('hpChanged', this)
  }

  resetUnique() {}

  update(delta) {
    // Landing squash + dust
    const grounded = this.body.blocked.down
    if (!this.wasGrounded && grounded && this.state === 'jump') {
      this.setState('idle')
      this.scene.tweens.killTweensOf(this)
      this.setScale(1)
      this.scene.tweens.add({
        targets: this, scaleX: 1.28,
        duration: 55, yoyo: true, ease: 'Quad.Out',
      })
      this.scene.spawnDust?.(this.x, this.y + 38)
    }
    this.wasGrounded = grounded

    // Foot glow follows fighter
    if (this._aura?.active) this._aura.setPosition(this.x, this.y + 38)

    if (this.stunTimer > 0) {
      this.stunTimer -= delta
      if (this.stunTimer <= 0) {
        this.clearStunStars()
        if (this.state !== 'dead') this.setState('idle')
      }
    }
    if (this.hurtTimer > 0) this.hurtTimer -= delta
    if (this.attackCooldown > 0) this.attackCooldown -= delta
    if (this.specialCooldown > 0) this.specialCooldown -= delta

    if (this.state !== 'dead' && !this.attackLocked)
      this.faceOpponent()

    this.updateShieldPosition()
    this.updateStunStars()
    this.updateUnique(delta)
  }

  updateUnique(delta) {}

  updateShieldPosition() {
    this.shield.setPosition(this.x + this.facing * 34, this.y - 28)
    this.shield.setFlipX(this.facing === -1)
  }

  spawnStunStars() {
    this.clearStunStars()
    for (let i = 0; i < 3; i++) {
      const star = this.scene.add.image(this.x, this.y - 70, 'stunstar')
        .setScale(0.9).setDepth(5)
      this.stunStars.push(star)
    }
  }

  updateStunStars() {
    const t = this.scene.time.now * 0.004
    this.stunStars.forEach((s, i) => {
      const angle = t + (i / this.stunStars.length) * Math.PI * 2
      s.setPosition(this.x + Math.cos(angle) * 28, this.y - 72 + Math.sin(angle) * 8)
    })
  }

  clearStunStars() {
    this.stunStars.forEach(s => s.destroy())
    this.stunStars = []
  }

  get distToOpponent() {
    if (!this.opponent) return 9999
    return Phaser.Math.Distance.Between(this.x, this.y, this.opponent.x, this.opponent.y)
  }
}
