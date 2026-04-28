/**
 * useSolarFlares — disparos esporádicos de "explosão solar" entre dois nós.
 *
 * A cada ~9-12s seleciona dois nós quaisquer e renderiza UMA curva Bézier 3D
 * assimétrica (ponto de controle deslocado perpendicularmente + jitter vertical),
 * com pulso brilhante (~1.5s) e fade-out. Apenas 1 flare ativo por vez.
 *
 * Não influencia física — só decora a cena.
 */

import { useEffect } from "react";
import {
  Group,
  BufferGeometry,
  LineBasicMaterial,
  Line,
  Float32BufferAttribute,
  AdditiveBlending,
  Vector3,
  QuadraticBezierCurve3,
} from "three";
import type { ForceGraphMethods } from "react-force-graph-3d";
import type { JarvisNode } from "@/lib/equityGraphJarvisAdapter";

const SEGMENTS = 48;
const FLARE_DURATION = 1500; // ms
const NEXT_MIN = 9000;
const NEXT_MAX = 12000;

function buildCurve(a: Vector3, b: Vector3): QuadraticBezierCurve3 {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a);
  const len = dir.length() || 1;
  dir.normalize();

  // Vetor perpendicular arbitrário (cross com up se possível, senão com x)
  const up = new Vector3(0, 1, 0);
  let perp = new Vector3().crossVectors(dir, up);
  if (perp.lengthSq() < 0.01) perp = new Vector3().crossVectors(dir, new Vector3(1, 0, 0));
  perp.normalize();

  // Segundo perpendicular para componente "vertical" rotacionada
  const perp2 = new Vector3().crossVectors(dir, perp).normalize();

  // Offset assimétrico: deslocamento ao longo dos dois perpendiculares,
  // E também desloca o ponto de controle ao longo do eixo A→B (assimetria),
  // para que o arco NÃO passe pelo meio reto.
  const lateralMag = len * (0.35 + Math.random() * 0.45); // 35-80% do comprimento
  const verticalMag = len * (0.15 + Math.random() * 0.35);
  const slideAlong = (Math.random() - 0.5) * len * 0.5; // -25%..+25% do meio

  const sign1 = Math.random() < 0.5 ? -1 : 1;
  const sign2 = Math.random() < 0.5 ? -1 : 1;

  const ctrl = mid
    .clone()
    .add(dir.clone().multiplyScalar(slideAlong))
    .add(perp.clone().multiplyScalar(lateralMag * sign1))
    .add(perp2.clone().multiplyScalar(verticalMag * sign2));

  return new QuadraticBezierCurve3(a, ctrl, b);
}

function curveToPositions(curve: QuadraticBezierCurve3): Float32Array {
  const pts = curve.getPoints(SEGMENTS);
  const arr = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    arr[i * 3] = pts[i].x;
    arr[i * 3 + 1] = pts[i].y;
    arr[i * 3 + 2] = pts[i].z;
  }
  return arr;
}

export function useSolarFlares(
  fgRef: React.MutableRefObject<ForceGraphMethods | undefined>,
  nodes: JarvisNode[],
  enabled: boolean,
  onActiveChange?: (active: boolean) => void,
) {
  useEffect(() => {
    if (!enabled || !fgRef.current || nodes.length < 2) return;
    const fg = fgRef.current;

    let scene: any;
    try {
      scene = (fg as any).scene?.();
    } catch {
      return;
    }
    if (!scene) return;

    // Limpa flare anterior (HMR / re-mount)
    try {
      const prev = scene.getObjectByName?.("solar-flare-active");
      if (prev) scene.remove(prev);
    } catch {}

    let cancelled = false;
    let raf = 0;
    let nextTimer: number | undefined;
    let activeGroup: Group | null = null;
    let activeStart = 0;
    let activeCoreMat: LineBasicMaterial | null = null;
    let activeHaloMat: LineBasicMaterial | null = null;

    const cleanupActive = () => {
      if (!activeGroup) return;
      try {
        scene.remove(activeGroup);
        activeGroup.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) obj.material.dispose();
        });
      } catch {}
      activeGroup = null;
      activeCoreMat = null;
      activeHaloMat = null;
      try { onActiveChange?.(false); } catch {}
    };

    const fire = () => {
      if (cancelled) return;
      cleanupActive();

      // Pega coords vivas
      let liveNodes: any[] = nodes;
      try {
        liveNodes = (fgRef.current as any)?.graphData?.()?.nodes ?? nodes;
      } catch {}
      const valid = liveNodes.filter(
        (n: any) =>
          Number.isFinite(n.x) && Number.isFinite(n.y) && Number.isFinite(n.z),
      );
      if (valid.length < 2) {
        scheduleNext();
        return;
      }

      const a = valid[Math.floor(Math.random() * valid.length)];
      let b = a;
      for (let i = 0; i < 8 && b.id === a.id; i++) {
        b = valid[Math.floor(Math.random() * valid.length)];
      }
      if (b.id === a.id) {
        scheduleNext();
        return;
      }

      const va = new Vector3(a.x, a.y, a.z);
      const vb = new Vector3(b.x, b.y, b.z);
      const curve = buildCurve(va, vb);
      const positions = curveToPositions(curve);

      const group = new Group();
      group.name = "solar-flare-active";

      // Halo (linha mais "espessa" via material aditivo + cor amarelo-âmbar)
      const haloGeo = new BufferGeometry();
      haloGeo.setAttribute("position", new Float32BufferAttribute(positions.slice(), 3));
      const haloMat = new LineBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        linewidth: 2, // linewidth raramente respeitado, mas mantemos
      });
      const halo = new Line(haloGeo, haloMat);
      halo.frustumCulled = false;
      group.add(halo);

      // Núcleo branco-quente
      const coreGeo = new BufferGeometry();
      coreGeo.setAttribute("position", new Float32BufferAttribute(positions, 3));
      const coreMat = new LineBasicMaterial({
        color: 0xfff7c2,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const core = new Line(coreGeo, coreMat);
      core.frustumCulled = false;
      group.add(core);

      scene.add(group);
      activeGroup = group;
      activeStart = performance.now();
      activeCoreMat = coreMat;
      activeHaloMat = haloMat;
      try { onActiveChange?.(true); } catch {}

      console.log("[SolarFlare] fired", { from: a.id, to: b.id });
    };

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = NEXT_MIN + Math.random() * (NEXT_MAX - NEXT_MIN);
      nextTimer = window.setTimeout(fire, delay);
    };

    const animate = () => {
      if (cancelled) return;
      if (activeGroup && activeCoreMat && activeHaloMat) {
        const elapsed = performance.now() - activeStart;
        const t = elapsed / FLARE_DURATION;
        if (t >= 1) {
          cleanupActive();
          scheduleNext();
        } else {
          // Envelope: ataque rápido (0→1 em 0.13), decaimento longo
          let env: number;
          if (t < 0.13) env = t / 0.13;
          else env = Math.max(0, 1 - (t - 0.13) / 0.87);
          activeCoreMat.opacity = env * 0.95;
          activeHaloMat.opacity = env * 0.7;
        }
      }
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    // Primeiro flare em 4-7s para o usuário ver rapidamente que existe
    nextTimer = window.setTimeout(fire, 4000 + Math.random() * 3000);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (nextTimer) window.clearTimeout(nextTimer);
      cleanupActive();
    };
  }, [fgRef, nodes, enabled]);
}
