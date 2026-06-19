import Fighter from './Fighter.js'

export default class Dice extends Fighter {
  setupUnique() {
    this.crossbowCooldown = 0
    this.tntDropCooldown = 0
    this.activeTNT = null
  }

  resetUnique() {
    this.crossbowCooldown = 0
    this.tntDropCooldown = 0
    if (this.activeTNT) { this.activeTNT.destroy(); this.activeTNT = null }
  }

  fireCrossbow() {
    if (this.crossbowCooldown > 0 || this.state === 'dead') return
    this.crossbowCooldown = this.cfg.crossbowCooldown
    const dir = this.facing
    const dmg = this.opponent ? this.opponent.maxHp * this.cfg.crossbowDamagePct : 10
    this.scene.spawnFlameBolt(this.x + dir * 30, this.y - 40, dir, dmg, this)
  }

  dropTNT() {
    if (this.tntDropCooldown > 0 || this.state === 'dead') return
    this.tntDropCooldown = this.cfg.tntCooldown
    const dmg = this.opponent ? this.opponent.maxHp * this.cfg.tntDamagePct : 23
    this.activeTNT = this.scene.spawnTNT(this.x, this.y - 10, dmg, this)
  }

  doSpecial() {
    if (this.specialCooldown > 0 || !this.activeTNT) return
    this.specialCooldown = this.cfg.specialCooldown

    // Shoot crossbow bolt at the TNT's position
    const tx = this.activeTNT.x, ty = this.activeTNT.y
    const dx = tx - this.x, dy = ty - this.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const doubleDmg = this.opponent ? this.opponent.maxHp * this.cfg.tntDoublePct : 46
    this.scene.spawnSpecialBolt(this.x, this.y - 40, dx/len, dy/len, this.activeTNT, doubleDmg, this)
    this.activeTNT = null
  }

  updateUnique(delta) {
    if (this.crossbowCooldown > 0) this.crossbowCooldown -= delta
    if (this.tntDropCooldown > 0) this.tntDropCooldown -= delta
  }

  get specialReady() { return this.specialCooldown <= 0 && this.activeTNT !== null }
  get crossbowReady() { return this.crossbowCooldown <= 0 }
  get tntReady() { return this.tntDropCooldown <= 0 }
}
