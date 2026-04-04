"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Loader } from "lucide-react";
import { useHealthStatus } from "@/hooks/use-health-status";

function ParticleField() {
  const ref = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const n = 5000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);

    const green = new THREE.Color("hsl(142, 76%, 46%)");
    const teal = new THREE.Color("hsl(180, 60%, 40%)");
    const red = new THREE.Color("hsl(0, 100%, 50%)");
    const white = new THREE.Color("hsl(0, 0%, 70%)");

    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.2 + (Math.random() - 0.5) * 0.6;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const roll = Math.random();
      let c: THREE.Color;
      if (roll < 0.45) c = green;
      else if (roll < 0.75) c = teal;
      else if (roll < 0.92) c = white;
      else c = red;

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    return [pos, col];
  }, []);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.08;
      ref.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <Points ref={ref} positions={positions} colors={colors} stride={3}>
      <PointMaterial
        vertexColors
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </Points>
  );
}

function InnerGlow() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y -= delta * 0.05;
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.8, 32, 32]} />
      <meshBasicMaterial color="#22c55e" transparent opacity={0.03} wireframe />
    </mesh>
  );
}

export default function EcosystemGlobe() {
  const { services: healthServices, loading, error } = useHealthStatus();

  const allOperational = !loading && !error && healthServices.every((s) => s.status === "operational");

  if (error && !loading) {
    return (
      <div className="w-full max-w-3xl mx-auto text-center">
        <div className="text-red-500 text-sm mb-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl aspect-square relative ">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.5} />
        <ParticleField />
        <InnerGlow />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          enableRotate={false}
        />
      </Canvas>

      {/* Center status indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          {loading ? (
            <Loader className="w-2.5 h-2.5 mx-auto mb-2 animate-spin text-muted-foreground" />
          ) : (
            <div className={`w-2.5 h-2.5 rounded-full mx-auto mb-2 ${allOperational ? "bg-success" : "bg-destructive"} status-pulse`} />
          )}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em]">
            {loading ? "Loading Status" : allOperational ? "All Systems Operational" : "Issues Detected"}
          </span>
        </div>
      </div>
    </div>
  );
}
