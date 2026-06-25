import Fighter from './Fighter.js'

export default class Dice extends Fighter {
  setupUnique() {
    this.crossbowCooldown = 0
    this.tntDropCooldown = 0
    this.activeTNTs = []
  }

  resetUnique() {
    this.crossbowCooldown = 0
    this.tntDropCooldown = 0
    this.activeTNTs.forEach(tnt => tnt?.destroy())
    this.activeTNTs = []
  }

  fireCrossbow() {
    if (this.crossbowCooldown > 0 || this.state === 'dead') return
    this.crossbowCooldown = this.cfg.crossbowCooldown
    const dir = this.facing
    const baseHp = this.opponent ? this.opponent.maxHp : 100
    const mainDmg = baseHp * this.cfg.crossbowDamagePct
    const sideDmg = baseHp * this.cfg.crossbowSideDamagePct
    const spread = this.cfg.crossbowVolleySpread

    this.scene.spawnFlameBolt(this.x + dir * 34, this.y - 42, dir, sideDmg, this, { velocityY: -spread, hitRadiusY: 78, homing: true })
    this.scene.spawnFlameBolt(this.x + dir * 38, this.y - 40, dir, mainDmg, this, { hitRadiusY: 82, homing: true })
    this.scene.spawnFlameBolt(this.x + dir * 34, this.y - 38, dir, sideDmg, this, { velocityY: spread, hitRadiusY: 78, homing: true })
  }

  dropTNT() {
    if (this.tntDropCooldown > 0 || this.state === 'dead') return
    this.tntDropCooldown = this.cfg.tntCooldown
    const dmg = this.opponent ? this.opponent.maxHp * this.cfg.tntDamagePct : 23
    const throwData = this.getTNTThrowData()
    this.setFacing(throwData.dir)

    const tnt = this.scene.spawnTNT(this.x + throwData.dir * 24, this.y - 22, dmg, this, {
      velocityX: throwData.velocityX,
      velocityY: throwData.velocityY,
      bounce: 0.35,
    })
    this.activeTNTs.push(tnt)
    while (this.activeTNTs.length > this.cfg.maxTNT) {
      const oldTNT = this.activeTNTs.shift()
      oldTNT?.destroy()
    }
  }

  getTNTThrowData() {
    if (!this.opponent) {
      return {
        dir: this.facing,
        velocityX: this.facing * 260,
        velocityY: -170,
      }
    }

    const dx = this.opponent.x - this.x
    const dy = this.opponent.y - this.y
    const dir = dx >= 0 ? 1 : -1
    const distance = Math.abs(dx)
    const velocityX = dir * Phaser.Math.Clamp(distance * 1.25, 300, 690)
    const velocityY = Phaser.Math.Clamp(dy * 0.35 - 250 - distance * 0.16, -470, -190)

    return { dir, velocityX, velocityY }
  }

  doSpecial() {
    if (this.specialCooldown > 0 || !this.activeTNT) return
    this.specialCooldown = this.cfg.specialCooldown
    this.setState('special')
    this.attackLocked = true

    const armedTNT = this.activeTNTs.filter(tnt => tnt?.active)
    const targetTNT = armedTNT[armedTNT.length - 1]
    const tx = targetTNT.x, ty = targetTNT.y
    const dx = tx - this.x, dy = ty - this.y
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    const doubleDmg = this.opponent ? this.opponent.maxHp * this.cfg.tntDoublePct : 46
    const chainDmg = this.opponent ? this.opponent.maxHp * this.cfg.tntDamagePct : 23
    this.scene.spawnSpecialBolt(this.x, this.y - 40, dx / len, dy / len, targetTNT, doubleDmg, this, {
      chainTNTs: armedTNT,
      chainDamage: chainDmg,
    })
    this.activeTNTs = []

    this.scene.time.delayedCall(360, () => {
      this.attackLocked = false
      if (this.state === 'special') this.setState('idle')
    })
  }

  updateUnique(delta) {
    if (this.crossbowCooldown > 0) this.crossbowCooldown -= delta
    if (this.tntDropCooldown > 0) this.tntDropCooldown -= delta
    this.activeTNTs = this.activeTNTs.filter(tnt => tnt?.active)
  }

  get specialReady() { return this.specialCooldown <= 0 && this.activeTNT !== null }
  get crossbowReady() { return this.crossbowCooldown <= 0 }
  get tntReady() { return this.tntDropCooldown <= 0 }
  get activeTNT() {
    for (let i = this.activeTNTs.length - 1; i >= 0; i--) {
      const tnt = this.activeTNTs[i]
      if (tnt?.active) return tnt
    }
    return null
  }

  clearTNT(tnt) {
    this.activeTNTs = this.activeTNTs.filter(active => active !== tnt)
  }
}
