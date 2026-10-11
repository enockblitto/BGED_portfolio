import * as THREE from 'three';
import { SVGLoader } from '../vendor/three/SVGLoader.js';

export function createLogo(svgText) {
  const data = new SVGLoader().parse(svgText);
  const shapes = [];
  data.paths.forEach((p) => shapes.push(...SVGLoader.createShapes(p)));
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 40, bevelEnabled: true, bevelThickness: 10, bevelSize: 7, bevelSegments: 4, curveSegments: 18,
  });
  geo.rotateX(Math.PI);
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const c = new THREE.Vector3();
  bb.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z);
  const h = bb.max.y - bb.min.y;
  geo.scale(1 / h, 1 / h, 1 / h);

  const fillPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const base = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0x1f2a2c, metalness: 0.6, roughness: 0.45, transparent: true, opacity: 0.55,
  }));
  const gold = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xe0b021, metalness: 0.95, roughness: 0.22, emissive: 0x3a2800, emissiveIntensity: 0.4,
    clippingPlanes: [fillPlane],
  }));
  const group = new THREE.Group();
  group.add(base, gold);
  base.castShadow = gold.castShadow = true;

  function setFill(p, worldY0, worldY1) {
    fillPlane.constant = worldY0 + (worldY1 - worldY0) * p;
  }
  function solid() {
    gold.material.clippingPlanes = null;
    gold.material.needsUpdate = true;
    base.visible = false;
  }
  return { group, setFill, solid, height: 1, width: (bb.max.x - bb.min.x) / h };
}
