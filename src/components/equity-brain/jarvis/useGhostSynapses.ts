/**
 * useGhostSynapses — overlay decorativo de "sinapses fantasmas" no grafo 3D.
 *
 * Não influencia a física. Cria linhas que aparecem/desaparecem entre pares
 * de nós marcados como "neurônios", simulando atividade neural viva.
 */

import { useEffect } from "react";
import {
  Group,
  BufferGeometry,
  LineBasicMaterial,
  Line,
  Float32BufferAttribute,
  AdditiveBlending,
  Color,
} from "three";
import type { ForceGraphMethods } from "react-force-graph-3d";
import type { JarvisNode } from "@/lib/equityGraphJarvisAdapter";

interface GhostSynapse {
  aId: string;
  bId: string;
  phaseOffset: number;
  speed: number;
  lifetime: number;
  bornAt: number;
}

const MAX_GHOSTS = 30;
const COLOR = new Color("#22d3ee");

function pickPair(neurons: JarvisNode[], all: JarvisNode[]): [string, string] | null {
  if (neurons.length < 1 || all.length < 2) return null;
  const a = neurons[Math.floor(Math.random() * neurons.length)];
  // partner: nó qualquer (preferir não-mesmo, não-mesmo cluster óbvio)
  for (let i = 0; i < 6; i++) {
    const b = all[Math.floor(Math.random() * all.length)];
    if (b.id !== a.id) return [a.id, b.id];
  }
  return null;
}

export function useGhostSynapses(
  fgRef: React.MutableRefObject<ForceGraphMethods | undefined>,
  nodes: JarvisNode[],
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !fgRef.current || nodes.length < 4) return;
    const fg = fgRef.current;

    let scene: any;
    try {
      scene = (fg as any).scene?.();
    } catch {
      return;
    }
    if (!scene) return;

    const neurons = nodes.filter((n) => n.isNeuron);
    if (neurons.length === 0) return;

    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const group = new Group();
    group.name = "ghost-synapses";
    scene.add(group);

    const ghosts: GhostSynapse[] = [];
    const lines: Line[] = [];

    // Pré-aloca pool de linhas
    for (let i = 0; i < MAX_GHOSTS; i++) {
      const geo = new BufferGeometry();
      geo.setAttribute("position", new Float32BufferAttribute(new Float32Array(6), 3));
      const mat = new LineBasicMaterial({
        color: COLOR,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const line = new Line(geo, mat);
      line.frustumCulled = false;
      group.add(line);
      lines.push(line);
    }

    // Inicializa ghosts
    const seedGhost = (now: number): GhostSynapse | null => {
      const pair = pickPair(neurons, nodes);
      if (!pair) return null;
      return {
        aId: pair[0],
        bId: pair[1],
        phaseOffset: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.2, // ciclos/s
        lifetime: 1500 + Math.random() * 2500,
        bornAt: now,
      };
    };

    const now0 = performance.now();
    for (let i = 0; i < MAX_GHOSTS; i++) {
      const g = seedGhost(now0);
      if (g) ghosts.push(g);
    }

    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const t = now / 1000;

      for (let i = 0; i < ghosts.length; i++) {
        const g = ghosts[i];
        const line = lines[i];
        if (!line) continue;

        // Re-seed se passou do lifetime
        if (now - g.bornAt > g.lifetime) {
          const fresh = seedGhost(now);
          if (fresh) ghosts[i] = fresh;
          (line.material as LineBasicMaterial).opacity = 0;
          continue;
        }

        const a = nodeById.get(g.aId) as any;
        const b = nodeById.get(g.bId) as any;
        if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(b.x)) {
          (line.material as LineBasicMaterial).opacity = 0;
          continue;
        }

        const pos = line.geometry.getAttribute("position") as Float32BufferAttribute;
        pos.setXYZ(0, a.x, a.y, a.z);
        pos.setXYZ(1, b.x, b.y, b.z);
        pos.needsUpdate = true;

        // Pulso senoidal: opacidade sobe e desce no ciclo
        const phase = Math.sin(t * g.speed + g.phaseOffset);
        const lifeFrac = (now - g.bornAt) / g.lifetime;
        const fade = Math.sin(lifeFrac * Math.PI); // 0→1→0 ao longo da vida
        const opacity = Math.max(0, phase) * 0.55 * fade;
        (line.material as LineBasicMaterial).opacity = opacity;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      try {
        scene.remove(group);
        lines.forEach((l) => {
          l.geometry.dispose();
          (l.material as LineBasicMaterial).dispose();
        });
      } catch {}
    };
  }, [fgRef, nodes, enabled]);
}
