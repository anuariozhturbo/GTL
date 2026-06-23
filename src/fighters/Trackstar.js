import Fighter from './Fighter.js'

export default class Trackstar extends Fighter {
  setupUnique() {
    this.speedStacks = 0
    this._dashHit = false
  }

  resetUnique() {
    this.speedStacks = 0
    this._dashHit = false
  }

  doAttack() {
    const currentCooldown = Math.max(
      this.cfg.minAttackCooldown,
      this.cfg.attackCooldown - this.speedStacks * this.cfg.attackSpeedGain
    )

    this.setState('attack')
    this.attackLocked = true
    this.attackCooldown = currentCooldown
    this.setVelocityX(0)

    this.scene.tweens.killTweensOf(this)
    this.setScale(1)
    this.scene.tweens.add({
      targets: this, scaleX: 1.18,
      duration: 45, yoyo: true, ease: 'Back.Out',
    })

    if (this.opponent) {
      const dir = this.opponent.x > this.x ? 1 : -1
      this.setVelocityX(dir * 240)
    }

    this.setTint(0xfde047)
    this.scene.time.delayedCall(70, () => this.clearTint())
    this.scene.time.delayedCall(95, () => this.checkHit())
    this.scene.time.delayedCall(Math.max(210, currentCooldown), () => {
      this.attackLocked = false
      this.setVelocityX(0)
      if (this.state === 'attack') this.setState('idle')
    })
  }

  checkHit() {
    const opp = this.opponent
    if (!opp || opp.state === 'dead') return

    if (this.distToOpponent < this.cfg.attackRange) {
      opp.takeDamage(this.cfg.attackDamage, true, this)
      this.speedStacks = Math.min(this.cfg.maxSpeedStacks, this.speedStacks + 1)
      this._showSpeedText()
    } else {
      this._resetSpeedStacks()
    }
  }

  doSpecial() {
    if (this.specialCooldown > 0 || !this.opponent) return

    this.setState('special')
    this.attackLocked = true
    this._dashHit = false
    this.faceOpponent()
    this.setVelocityX(this.facing * this.cfg.dashSpeed)
    this.setVelocityY(-80)

    const trailEvt = this.scene.time.addEvent({ delay: 22, loop: true, callback: () => {
      if (!this.active) { trailEvt.remove(); return }
      this.scene.spawnDashTrail?.(this.x, this.y, this)
    }})

    const hitEvt = this.scene.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (!this.active) { hitEvt.remove(); return }
      const opp = this.opponent
      if (opp && opp.state !== 'dead' && this.distToOpponent < this.cfg.attackRange * 1.7) {
        this._dashHit = true
        const dmg = Math.floor(opp.maxHp * this.cfg.dashDamagePct)
        opp.takeDamage(dmg, false, this)
        this.scene.spawnHitSpark?.(opp.x, opp.y - 40, false)
        this.specialCooldown = 0
        hitEvt.remove()
      }
    }})

    this.scene.time.delayedCall(this.cfg.dashDuration, () => {
      trailEvt.remove()
      hitEvt.remove()
      this.attackLocked = false
      this.setVelocityX(0)
      if (!this._dashHit) {
        this.specialCooldown = this.cfg.specialCooldown
        this._resetSpeedStacks()
      }
      if (this.state === 'special') this.setState('idle')
    })
  }

  _resetSpeedStacks() {
    if (this.speedStacks <= 0) return
    this.speedStacks = 0
    const txt = this.scene.add.text(this.x, this.y - 86, 'RESET', {
      fontSize: '16px', color: '#ef4444', fontFamily: 'monospace',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20)
    this.scene.tweens.add({
      targets: txt, y: txt.y - 28, alpha: 0, duration: 520, ease: 'Quad.Out',
      onComplete: () => txt.destroy(),
    })
  }

  _showSpeedText() {
    const txt = this.scene.add.text(this.x, this.y - 86, `SPEED +${this.speedStacks * this.cfg.attackSpeedGain}`, {
      fontSize: '15px', color: '#fde047', fontFamily: 'monospace',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20)
    this.scene.tweens.add({
      targets: txt, y: txt.y - 24, alpha: 0, duration: 460, ease: 'Quad.Out',
      onComplete: () => txt.destroy(),
    })
  }

  get specialReady() { return this.specialCooldown <= 0 }
}
