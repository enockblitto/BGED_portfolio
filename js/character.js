import * as THREE from 'three';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function mat(color, rough = 0.7, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function headGeometry(w, h, d) {
  const g = new THREE.SphereGeometry(0.5, 48, 40);
  g.scale(w, h, d);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (z > -d * 0.05) uv.setXY(i, x / w + 0.5, y / h + 0.5);
    else uv.setXY(i, -1, -1);
  }
  uv.needsUpdate = true;
  return g;
}

function limb(r, len, material) {
  const g = new THREE.CapsuleGeometry(r, len, 6, 16);
  g.translate(0, -len / 2 - r * 0.4, 0);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  return m;
}

export function createCharacter(faceTexture) {
  const M = {
    suit: mat(0x1a1c21, 0.62),
    suitDark: mat(0x111216, 0.7),
    shirt: mat(0xf1efe9, 0.55),
    tie: mat(0x1597a0, 0.35, 0.1),
    skin: mat(0x5c5551, 0.6),
    hair: mat(0x161616, 0.9),
    shoe: mat(0x0b0b0d, 0.25, 0.3),
    watch: mat(0xd9dde2, 0.2, 1),
    gold: mat(0xd6a40c, 0.3, 0.9),
  };

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const pelvis = new THREE.Group();
  pelvis.position.y = 0.85;
  body.add(pelvis);
  const hipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), M.suit);
  hipMesh.scale.set(1.05, 0.5, 0.72);
  pelvis.add(hipMesh);

  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group();
    hip.position.set(0.15 * s, 0, 0);
    pelvis.add(hip);
    hip.add(limb(0.115, 0.28, M.suit));
    const knee = new THREE.Group();
    knee.position.y = -0.38;
    hip.add(knee);
    knee.add(limb(0.105, 0.26, M.suit));
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.16, 6, 12), M.shoe);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1.05, 1, 0.75);
    shoe.position.set(0, -0.39, 0.07);
    knee.add(shoe);
    return { hip, knee };
  });

  const torso = new THREE.Group();
  torso.position.y = 0.86;
  body.add(torso);
  const jacketG = new THREE.CapsuleGeometry(0.33, 0.42, 8, 24);
  const jacket = new THREE.Mesh(jacketG, M.suit);
  jacket.scale.set(1.05, 1, 0.7);
  jacket.position.y = 0.4;
  jacket.castShadow = true;
  torso.add(jacket);

  const front = 0.33 * 0.7 + 0.004;
  const vShape = new THREE.Shape();
  vShape.moveTo(-0.13, 0.78); vShape.lineTo(0.13, 0.78); vShape.lineTo(0, 0.36); vShape.closePath();
  const shirtV = new THREE.Mesh(new THREE.ShapeGeometry(vShape), M.shirt);
  shirtV.position.z = front;
  torso.add(shirtV);
  const tieShape = new THREE.Shape();
  tieShape.moveTo(-0.035, 0.74); tieShape.lineTo(0.035, 0.74); tieShape.lineTo(0.025, 0.69);
  tieShape.lineTo(0.06, 0.42); tieShape.lineTo(0, 0.34); tieShape.lineTo(-0.06, 0.42);
  tieShape.lineTo(-0.025, 0.69); tieShape.closePath();
  const tie = new THREE.Mesh(new THREE.ExtrudeGeometry(tieShape, { depth: 0.012, bevelEnabled: false }), M.tie);
  tie.position.z = front + 0.002;
  torso.add(tie);
  [-1, 1].forEach((s) => {
    const l = new THREE.Shape();
    l.moveTo(0.13 * s, 0.8); l.lineTo(0.2 * s, 0.7); l.lineTo(0.02 * s, 0.33); l.lineTo(0, 0.36); l.closePath();
    const lapel = new THREE.Mesh(new THREE.ExtrudeGeometry(l, { depth: 0.012, bevelEnabled: false }), M.suitDark);
    lapel.position.z = front - 0.004;
    torso.add(lapel);
  });
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.01), M.shirt);
  pocket.position.set(0.19, 0.62, front - 0.02);
  pocket.rotation.y = 0.35;
  torso.add(pocket);
  [0.3, 0.2].forEach((y) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), M.suitDark);
    b.position.set(0.02, y, front - 0.012);
    torso.add(b);
  });

  const neck = new THREE.Group();
  neck.position.y = 0.86;
  torso.add(neck);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.13, 0.08, 20, 1, true), M.shirt);
  collar.position.y = 0.0;
  neck.add(collar);
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.18, 16), M.skin);
  neckMesh.position.y = 0.06;
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.y = 0.12;
  neck.add(head);
  const HW = 0.86, HH = 1.085, HD = 0.84;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 32), M.hair);
  skull.scale.set(HW * 0.985, HH * 0.97, HD * 0.97);
  skull.position.y = HH / 2 - 0.04;
  skull.castShadow = true;
  head.add(skull);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  faceTexture.wrapS = faceTexture.wrapT = THREE.ClampToEdgeWrapping;
  faceTexture.anisotropy = 4;
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTexture, transparent: true, alphaTest: 0.05, roughness: 0.75, metalness: 0,
  });
  const face = new THREE.Mesh(headGeometry(HW, HH, HD), faceMat);
  face.position.y = HH / 2 - 0.04;
  head.add(face);

  const arms = [-1, 1].map((s) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.39 * s, 0.7, 0);
    torso.add(shoulder);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), M.suit);
    shoulder.add(pad);
    shoulder.add(limb(0.095, 0.26, M.suit));
    const elbow = new THREE.Group();
    elbow.position.y = -0.38;
    shoulder.add(elbow);
    elbow.add(limb(0.088, 0.24, M.suit));
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14), M.shirt);
    cuff.position.y = -0.36;
    elbow.add(cuff);
    const hand = new THREE.Group();
    hand.position.y = -0.44;
    elbow.add(hand);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), M.skin);
    palm.scale.set(0.9, 1.1, 0.75);
    hand.add(palm);
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.05, 4, 8), M.skin);
    thumb.position.set(-0.06 * s, 0.01, 0.04);
    thumb.rotation.z = 0.6 * s;
    hand.add(thumb);
    if (s === 1) {
      const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.083, 0.04, 16), M.watch);
      watch.position.y = -0.31;
      elbow.add(watch);
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 16), mat(0x101010, 0.2, 0.4));
      dial.rotation.x = Math.PI / 2;
      dial.position.set(0, -0.31, 0.085);
      elbow.add(dial);
    }
    const anchor = new THREE.Group();
    anchor.position.set(0, -0.06, 0.1);
    hand.add(anchor);
    return { shoulder, elbow, hand, anchor };
  });

  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(0,0,0,.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.5),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  root.add(shadow);

  // [rArm(-x, screen left), lArm(+x)]
  const J = {
    bodyY: 0, bodyRotY: 0, bodyRotZ: 0, torsoX: 0, torsoY: 0, torsoZ: 0,
    headX: 0, headY: 0, headZ: 0,
    a0x: 0, a0z: -0.12, e0x: 0, e0z: 0,
    a1x: 0, a1z: 0.12, e1x: 0, e1z: 0,
    h0: 0, k0: 0, h1: 0, k1: 0,
  };
  const cur = { ...J };

  function apply(dt, k = 10) {
    for (const key in J) cur[key] = damp(cur[key], J[key], k, dt);
    body.position.y = cur.bodyY;
    body.rotation.y = cur.bodyRotY;
    body.rotation.z = cur.bodyRotZ;
    torso.rotation.set(cur.torsoX, cur.torsoY, cur.torsoZ);
    head.rotation.set(cur.headX, cur.headY, cur.headZ);
    arms[0].shoulder.rotation.set(cur.a0x, 0, cur.a0z);
    arms[0].elbow.rotation.set(cur.e0x, 0, cur.e0z);
    arms[1].shoulder.rotation.set(cur.a1x, 0, cur.a1z);
    arms[1].elbow.rotation.set(cur.e1x, 0, cur.e1z);
    legs[0].hip.rotation.x = cur.h0;
    legs[0].knee.rotation.x = cur.k0;
    legs[1].hip.rotation.x = cur.h1;
    legs[1].knee.rotation.x = cur.k1;
    shadow.scale.setScalar(1 - clamp(cur.bodyY, 0, 1) * 0.5);
  }

  function rest(t) {
    const br = Math.sin(t * 1.8);
    Object.assign(J, {
      bodyY: 0, bodyRotZ: 0, torsoX: 0.02 * br, torsoY: 0, torsoZ: 0,
      headX: 0, headY: 0, headZ: 0.02 * Math.sin(t * 0.9),
      a0x: 0.04 * br, a0z: -0.14, e0x: -0.15, e0z: 0,
      a1x: -0.04 * br, a1z: 0.14, e1x: -0.15, e1z: 0,
      h0: 0, k0: 0, h1: 0, k1: 0,
    });
  }

  const poses = {
    idle(t) { rest(t); },
    hold(t) {
      rest(t);
      J.a0x = -2.05; J.a0z = -0.35; J.e0x = -0.55;
      J.a1z = 0.2; J.a1x = -0.25; J.e1x = -1.0;
      J.headX = -0.12; J.headY = -0.18; J.torsoZ = -0.04;
      J.bodyY = 0.015 * Math.abs(Math.sin(t * 2.2));
    },
    windup(t) {
      rest(t);
      J.a0x = -2.9; J.a0z = -0.55; J.e0x = -1.6;
      J.torsoY = -0.35; J.torsoZ = 0.08; J.headY = -0.35; J.headX = -0.2;
      J.a1z = 0.6; J.a1x = -0.6; J.e1x = -0.4;
      J.h0 = -0.2; J.k0 = 0.3; J.h1 = 0.25;
    },
    release(t) {
      rest(t);
      J.a0x = -2.4; J.a0z = -1.25; J.e0x = 0;
      J.torsoY = 0.25; J.torsoZ = -0.12; J.headY = -0.4; J.headX = -0.4;
      J.a1z = 0.5; J.a1x = 0.3; J.h0 = 0.2; J.h1 = -0.25; J.k1 = 0.3;
      J.bodyY = 0.08;
    },
    wave(t) {
      rest(t);
      J.a1z = 2.5; J.a1x = -0.2; J.e1x = -0.25; J.e1z = 0.5 + Math.sin(t * 9) * 0.45;
      J.headZ = -0.07; J.torsoZ = -0.04;
      J.bodyY = 0.02 * Math.abs(Math.sin(t * 4.5));
    },
    juggle(t) {
      rest(t);
      const s = Math.sin(t * 6);
      J.a0x = -0.55 - 0.25 * s; J.e0x = -1.2; J.a0z = -0.1;
      J.a1x = -0.55 + 0.25 * s; J.e1x = -1.2; J.a1z = 0.1;
      J.headX = -0.28 - 0.05 * Math.sin(t * 3); J.headY = 0.12 * Math.sin(t * 3);
      J.bodyY = 0.015 * Math.abs(s);
    },
    point(t, side = 1) {
      rest(t);
      const pulse = Math.max(0, Math.sin(t * 2.2)) * 0.12;
      if (side > 0) {
        J.a1z = 1.45 + pulse; J.a1x = -0.35; J.e1x = -0.1;
        J.a0z = -0.2; J.a0x = -0.35; J.e0x = -1.4;
      } else {
        J.a0z = -1.45 - pulse; J.a0x = -0.35; J.e0x = -0.1;
        J.a1z = 0.2; J.a1x = -0.35; J.e1x = -1.4;
      }
      J.headY = 0.3 * side; J.torsoY = 0.15 * side;
    },
    draw(t) {
      rest(t);
      J.a0x = -1.35 + Math.sin(t * 2.6) * 0.35; J.a0z = -0.25 + Math.cos(t * 1.3) * 0.35;
      J.e0x = -0.55 + Math.sin(t * 2.6 + 1) * 0.2;
      J.a1z = 0.25; J.a1x = -0.3; J.e1x = -1.3;
      J.headX = -0.1 + Math.sin(t * 2.6) * 0.05; J.headY = -0.2 + Math.cos(t * 1.3) * 0.12;
      J.torsoY = -0.1;
    },
    call(t) {
      rest(t);
      J.a1x = -0.25; J.a1z = 0.65; J.e1x = -2.35; J.e1z = -0.5;
      J.headZ = 0.14; J.headY = 0.15;
      const w = Math.max(0, Math.sin(t * 1.4));
      J.a0z = -0.25 - 2.1 * w; J.e0z = -0.5 * w * (0.5 + 0.5 * Math.sin(t * 10));
      J.bodyY = 0.02 * Math.abs(Math.sin(t * 3));
    },
    cheer(t) {
      rest(t);
      const j = Math.abs(Math.sin(t * 5));
      J.a0z = -2.6; J.a1z = 2.6; J.e0z = 0.3; J.e1z = -0.3;
      J.bodyY = 0.15 * j; J.k0 = J.k1 = 0.3 * (1 - j); J.h0 = J.h1 = -0.15 * (1 - j);
      J.headX = -0.15;
    },
  };

  let walkPhase = 0;
  function walk(amount, dt) {
    if (amount < 0.01) return;
    walkPhase += dt * (6 + 5 * amount);
    const s = Math.sin(walkPhase), c = Math.cos(walkPhase);
    const a = clamp(amount, 0, 1);
    const mix = (k, v) => { J[k] = J[k] * (1 - a) + v * a; };
    mix('h0', 0.55 * s); mix('h1', -0.55 * s);
    mix('k0', 0.6 * Math.max(0, -s) + 0.1); mix('k1', 0.6 * Math.max(0, s) + 0.1);
    mix('a0x', -0.45 * s); mix('a1x', 0.45 * s);
    mix('a0z', -0.12); mix('a1z', 0.12); mix('e0x', -0.35); mix('e1x', -0.35); mix('e0z', 0); mix('e1z', 0);
    mix('bodyY', 0.04 * Math.abs(c));
    mix('torsoX', 0.06);
    mix('bodyRotZ', 0.03 * s);
  }

  return { root, body, head, arms, legs, poses, J, cur, apply, walk, materials: M, HH };
}
