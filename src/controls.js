import { clamp } from './util.js?v=fea1c89f';

const EYE = 1.7;

/** First-person walking: WASD + mouse (pointer lock, or drag), touch sticks on mobile. */
export class Player {
  constructor(camera, canvas, world, city) {
    this.camera = camera; this.world = world; this.collide = (pos) => city.collide(pos);   // replaced when the place changes
    this.homeFloor = city.floorAt ? (x, z) => city.floorAt(x, z) : null; world.floorAt = this.homeFloor;   // Manhattan's stoops, sidewalks, footbridges and floors
    this.pos = { x: 0, y: 5, z: 2 };
    this.yaw = Math.PI - 0.1; this.pitch = 0.12;
    this.keys = new Set();
    this.touchMove = { x: 0, y: 0 };
    camera.rotation.order = 'YXZ';

    addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey) this.keys.add(e.code); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    // mouse
    let dragging = false;
    canvas.addEventListener('mousedown', () => { dragging = true; if (canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* drag-look fallback */ } } });
    addEventListener('mouseup', () => { dragging = false; });
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === canvas || dragging) this.look(e.movementX, e.movementY, 0.0022);
    });

    // touch: left half moves, right half looks
    const touches = new Map();
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) touches.set(t.identifier, { sx: t.clientX, sy: t.clientY, lx: t.clientX, ly: t.clientY, move: t.clientX < innerWidth / 2 });
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const s = touches.get(t.identifier); if (!s) continue;
        if (s.move) { this.touchMove.x = clamp((t.clientX - s.sx) / 50, -1, 1); this.touchMove.y = clamp((t.clientY - s.sy) / 50, -1, 1); }
        else this.look(t.clientX - s.lx, t.clientY - s.ly, 0.005);
        s.lx = t.clientX; s.ly = t.clientY;
      }
    }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) { const s = touches.get(t.identifier); if (s && s.move) this.touchMove.x = this.touchMove.y = 0; touches.delete(t.identifier); } };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
  }

  look(dx, dy, k) {
    this.yaw -= dx * k;
    this.pitch = clamp(this.pitch - dy * k, -1.45, 1.45);
  }

  update(dt) {
    const k = this.keys;
    let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - this.touchMove.y;
    let s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + this.touchMove.x;
    const len = Math.hypot(f, s);
    if (len > 0.01) {
      const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? 20 : 7) * dt / Math.max(1, len);
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      this.pos.x += (-sin * f + cos * s) * speed;
      this.pos.z += (-cos * f - sin * s) * speed;
    }
    const b = this.world.profile.bounds, d = this.world.deck;
    // a bridge deck is walkable when you come onto it from its ramp (not when you pass underneath)
    if (this.onDeck && d && this.pos.x > d.x0 + 60) this.pos.z = clamp(this.pos.z, d.z - d.hw + 0.5, d.z + d.hw - 0.5);   // parapets
    this.pos.x = clamp(this.pos.x, -b.x, this.onDeck && d ? d.end - 6 : b.x);
    this.pos.z = clamp(this.pos.z, -b.z, b.z);
    if (this.collide && !this.onDeck) this.collide(this.pos);
    let ground = Math.max(this.world.surfaceAt(this.pos.x, this.pos.z), this.world.sea - 0.9);
    const dy = d ? d.yAt(this.pos.x, this.pos.z - d.z) : null;
    this.onDeck = dy !== null && this.pos.y - EYE > dy - 1.2 && dy > ground - 0.01;
    if (this.onDeck) ground = dy;
    ground += EYE;
    this.pos.y += (ground - this.pos.y) * Math.min(1, dt * (ground > this.pos.y ? 20 : 8));   // climb briskly, settle gently
    if (this.pos.y < ground - 0.3) this.pos.y = ground - 0.3;   // never sink so far below a step that it walls you in
    if (this.fly) this.pos.y = this.fly;   // debug: hover at a fixed height
    this.camera.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
