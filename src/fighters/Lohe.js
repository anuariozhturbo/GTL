import Fighter from './Fighter.js'

export default class Lohe extends Fighter {
  setupUnique() {
    this._hitCombo  = 0
    this._boostTimer = 0
  }

  resetUnique() {
    this._hitCombo  = 0
    this._boostTimer = 0
  }

  checkHit() {
    const opp = this.opponent
    if (!opp || opp.state === 'dead') return
    if (this.distToOpponent < this.cfg.attackRange) {
      opp.takeDamage(this.cfg.attackDamage, true, this)
      this._hitCombo++

      if (this._hitCombo >= this.cfg.knockbackCombo) {
        this._hitCombo = 0
        this._doKnockback(opp)
      }
    }
  }

  _doKnockback(opp) {
    // Launch opponent toward the far half of the stage
    const dir = opp.x > this.x ? 1 : -1
    opp.setVelocityX(dir * this.cfg.knockbackForce)
    opp.setVelocityY(-340)
    opp.stunTimer = 600

    opp.setTint(0xfde047)
    this.scene.time.delayedCall(300, () => { if (opp?.active) opp.clearTint() })

    // "SMASH!" popup
    const txt = this.scene.add.text(opp.x, opp.y - 70, 'SMASH!', {
      fontSize: '24px', color: '#fde047', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20)
    this.scene.tweens.add({
      targets: txt, y: txt.y - 40, alpha: 0, duration: 900, ease: 'Quad.Out',
      onComplete: () => txt.destroy(),
    })
  }

  // Special: lunge at opponent, deal 23% max HP, then get attack speed boost for 11s
  doSpecial() {
    if (this.specialCooldown > 0 || !this.opponent) return
    this.specialCooldown = this.cfg.specialCooldown
    this.setState('special')

    const dir = this.opponent.x > this.x ? 1 : -1
    this.setVelocityX(dir * 700)
    this.setVelocityY(-90)

    let hit = false
    const hitEvt = this.scene.time.addEvent({ delay: 20, loop: true, callback: () => {
      if (!this.active) { hitEvt.remove(); return }
      const opp = this.opponent
      if (!hit && opp && opp.state !== 'dead' && this.distToOpponent < this.cfg.attackRange * 1.6) {
        hit = true
        hitEvt.remove()
        const dmg = Math.floor(opp.maxHp * this.cfg.lungeDamagePct)
        opp.takeDamage(dmg, false, this)
        this.scene.spawnHitSpark?.(opp.x, opp.y - 40, false)
        opp.setTint(0xfde047)
        this.scene.time.delayedCall(200, () => { if (opp?.active) opp.clearTint() })
      }
    }})

    this.scene.time.delayedCall(400, () => {
      hitEvt.remove()
      this.setVelocityX(0)
      if (this.state === 'special') this.setState('idle')

      // Activate attack speed boost
      this._boostTimer = this.cfg.attackBoostDuration

      // Brief self-tint to signal boost activation
      this.setTint(0xfef9c3)
      this.scene.time.delayedCall(220, () => { if (this.active) this.clearTint() })
    })
  }

  updateUnique(delta) {
    if (this._boostTimer > 0) {
      this._boostTimer -= delta
      // Cap attack cooldown so attacks refresh at boosted speed
      if (this.attackCooldown > this.cfg.boostedCooldown) {
        this.attackCooldown = this.cfg.boostedCooldown
      }
    }
  }

  get specialReady() { return this.specialCooldown <= 0 }
}
