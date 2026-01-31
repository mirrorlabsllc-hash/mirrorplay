import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, Float, Environment, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

interface Orb3DProps {
  isActive: boolean;
  isSpeaking: boolean;
  audioLevel: number;
}

function FresnelGlow({ color, intensity = 1, scale = 1 }: { color: string; intensity?: number; scale?: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const fresnelMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        intensity: { value: intensity },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float intensity;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
          gl_FragColor = vec4(color, fresnel * intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
  }, [color, intensity]);

  return (
    <mesh scale={scale}>
      <sphereGeometry args={[1, 64, 64]} />
      <primitive object={fresnelMaterial} attach="material" />
    </mesh>
  );
}

function InnerCore({ isActive, isSpeaking, audioLevel }: Orb3DProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!coreRef.current) return;
    const time = state.clock.elapsedTime;
    
    const pulseIntensity = isSpeaking 
      ? 0.9 + audioLevel * 0.3 
      : isActive ? 0.7 + Math.sin(time * 2) * 0.15 : 0.5;
    
    const coreScale = isSpeaking 
      ? 0.25 + audioLevel * 0.1 
      : 0.2 + Math.sin(time * 1.5) * 0.03;
    
    coreRef.current.scale.setScalar(coreScale);
    (coreRef.current.material as THREE.MeshBasicMaterial).opacity = pulseIntensity;

    if (innerGlowRef.current) {
      innerGlowRef.current.scale.setScalar(coreScale * 1.8);
      (innerGlowRef.current.material as THREE.MeshBasicMaterial).opacity = pulseIntensity * 0.4;
    }
  });

  return (
    <>
      <Sphere ref={coreRef} args={[1, 32, 32]}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
      <Sphere ref={innerGlowRef} args={[1, 24, 24]}>
        <meshBasicMaterial
          color="#f0abfc"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
    </>
  );
}

function ReflectiveShell({ isActive, isSpeaking, audioLevel }: Orb3DProps) {
  const shellRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);

  useFrame((state) => {
    if (!shellRef.current) return;
    const time = state.clock.elapsedTime;
    
    shellRef.current.rotation.y = time * 0.08;
    shellRef.current.rotation.x = Math.sin(time * 0.15) * 0.05;
    
    const pulseScale = isSpeaking 
      ? 1.02 + audioLevel * 0.04 
      : 1.02 + Math.sin(time * 1.5) * 0.01;
    shellRef.current.scale.setScalar(pulseScale);
  });

  return (
    <Sphere ref={shellRef} args={[1, 128, 128]}>
      <meshPhysicalMaterial
        ref={materialRef}
        color="#a855f7"
        metalness={0.95}
        roughness={0.05}
        clearcoat={1}
        clearcoatRoughness={0.02}
        reflectivity={1}
        envMapIntensity={2.5}
        transparent
        opacity={0.35}
        side={THREE.FrontSide}
      />
    </Sphere>
  );
}

function GlassLayer({ isActive, isSpeaking, audioLevel }: Orb3DProps) {
  const glassRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!glassRef.current) return;
    const time = state.clock.elapsedTime;
    
    glassRef.current.rotation.y = -time * 0.05;
    
    const scale = isSpeaking 
      ? 1.04 + audioLevel * 0.02 
      : 1.04;
    glassRef.current.scale.setScalar(scale);
  });

  return (
    <Sphere ref={glassRef} args={[1, 64, 64]}>
      <MeshTransmissionMaterial
        backside
        samples={8}
        thickness={0.3}
        chromaticAberration={0.15}
        anisotropy={0.3}
        distortion={0.2}
        distortionScale={0.3}
        temporalDistortion={0.1}
        iridescence={1}
        iridescenceIOR={1.5}
        iridescenceThicknessRange={[100, 400]}
        clearcoat={1}
        attenuationDistance={0.5}
        attenuationColor="#c084fc"
        color="#e9d5ff"
        transmission={0.95}
        roughness={0}
        ior={1.5}
      />
    </Sphere>
  );
}

function EnergyParticles({ isActive, isSpeaking, audioLevel }: Orb3DProps) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particleCount = 80;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 1.15 + Math.random() * 0.4;
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!particlesRef.current) return;
    const time = state.clock.elapsedTime;
    
    particlesRef.current.rotation.y = time * 0.12;
    particlesRef.current.rotation.x = Math.sin(time * 0.15) * 0.08;
    
    const geo = particlesRef.current.geometry;
    const posArray = geo.attributes.position.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const baseRadius = 1.15 + (i % 5) * 0.08;
      const expansionFactor = isSpeaking ? 1 + audioLevel * 0.25 : 1;
      const radiusMultiplier = baseRadius * expansionFactor + Math.sin(time + i * 0.5) * 0.04;
      
      const theta = (i / particleCount) * Math.PI * 2 + time * 0.15;
      const phi = Math.acos(2 * ((i * 1.618) % 1) - 1);
      
      posArray[i * 3] = radiusMultiplier * Math.sin(phi) * Math.cos(theta);
      posArray[i * 3 + 1] = radiusMultiplier * Math.sin(phi) * Math.sin(theta);
      posArray[i * 3 + 2] = radiusMultiplier * Math.cos(phi);
    }
    geo.attributes.position.needsUpdate = true;
  });

  const opacity = isActive ? (isSpeaking ? 0.9 : 0.6) : 0.35;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color="#f5d0fe"
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

function AuroraWisps({ isActive, isSpeaking, audioLevel }: Orb3DProps) {
  const wisp1Ref = useRef<THREE.Mesh>(null);
  const wisp2Ref = useRef<THREE.Mesh>(null);
  const wisp3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const speedMult = isSpeaking ? 1.5 : 1;
    
    if (wisp1Ref.current) {
      wisp1Ref.current.rotation.z = time * 0.2 * speedMult;
      wisp1Ref.current.rotation.x = Math.sin(time * 0.3) * 0.15;
      const scale = 1.08 + (isSpeaking ? audioLevel * 0.1 : Math.sin(time) * 0.02);
      wisp1Ref.current.scale.setScalar(scale);
    }
    
    if (wisp2Ref.current) {
      wisp2Ref.current.rotation.z = -time * 0.15 * speedMult + Math.PI / 4;
      wisp2Ref.current.rotation.y = Math.cos(time * 0.25) * 0.1;
      const scale = 1.12 + (isSpeaking ? audioLevel * 0.08 : Math.cos(time * 0.7) * 0.02);
      wisp2Ref.current.scale.setScalar(scale);
    }
    
    if (wisp3Ref.current) {
      wisp3Ref.current.rotation.z = time * 0.12 * speedMult + Math.PI / 2;
      wisp3Ref.current.rotation.x = Math.sin(time * 0.4) * 0.12;
      const scale = 1.15 + (isSpeaking ? audioLevel * 0.12 : Math.sin(time * 0.9) * 0.015);
      wisp3Ref.current.scale.setScalar(scale);
    }
  });

  const baseOpacity = isActive ? 0.2 : 0.12;

  return (
    <>
      <mesh ref={wisp1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.015, 16, 100]} />
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={baseOpacity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={wisp2Ref} rotation={[Math.PI / 2.5, 0.3, 0]}>
        <torusGeometry args={[1, 0.012, 16, 100]} />
        <meshBasicMaterial
          color="#ec4899"
          transparent
          opacity={baseOpacity * 0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={wisp3Ref} rotation={[Math.PI / 3, -0.2, 0]}>
        <torusGeometry args={[1, 0.01, 16, 100]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={baseOpacity * 0.6}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}

function AnimatedOrb({ isActive, isSpeaking, audioLevel }: Orb3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);

  const baseDistort = isActive ? 0.25 : 0.12;
  const targetDistort = isSpeaking ? 0.3 + audioLevel * 0.2 : baseDistort;
  
  const baseSpeed = isActive ? 2.5 : 1.2;
  const targetSpeed = isSpeaking ? 4 + audioLevel * 2.5 : baseSpeed;

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    meshRef.current.rotation.y = time * 0.1;
    meshRef.current.rotation.x = Math.sin(time * 0.2) * 0.08;
    
    const pulseScale = isSpeaking 
      ? 1 + audioLevel * 0.06 
      : 1 + Math.sin(time * (isActive ? 1.8 : 0.8)) * 0.015;
    meshRef.current.scale.setScalar(pulseScale);
    
    materialRef.current.distort = THREE.MathUtils.lerp(
      materialRef.current.distort, 
      targetDistort, 
      0.08
    );
    materialRef.current.speed = THREE.MathUtils.lerp(
      materialRef.current.speed,
      targetSpeed,
      0.08
    );
  });

  const gradientTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    
    const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
    gradient.addColorStop(0, "#fae8ff");
    gradient.addColorStop(0.15, "#f5d0fe");
    gradient.addColorStop(0.3, "#e879f9");
    gradient.addColorStop(0.45, "#d946ef");
    gradient.addColorStop(0.6, "#a855f7");
    gradient.addColorStop(0.75, "#7c3aed");
    gradient.addColorStop(0.9, "#5b21b6");
    gradient.addColorStop(1, "#2e1065");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
    
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const radius = 30 + Math.random() * 100;
      const starGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      starGradient.addColorStop(0, "rgba(255,255,255,0.5)");
      starGradient.addColorStop(0.5, "rgba(255,220,255,0.2)");
      starGradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = starGradient;
      ctx.fillRect(0, 0, 1024, 1024);
    }
    
    ctx.globalCompositeOperation = "overlay";
    const noiseCanvas = document.createElement("canvas");
    noiseCanvas.width = 256;
    noiseCanvas.height = 256;
    const noiseCtx = noiseCanvas.getContext("2d")!;
    const imageData = noiseCtx.createImageData(256, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const val = Math.random() * 40 + 215;
      imageData.data[i] = val;
      imageData.data[i + 1] = val;
      imageData.data[i + 2] = val;
      imageData.data[i + 3] = 30;
    }
    noiseCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(noiseCanvas, 0, 0, 1024, 1024);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <>
      <Environment preset="night" />
      
      <ambientLight intensity={0.25} color="#f0abfc" />
      
      <pointLight
        position={[3, 2, 4]}
        intensity={3}
        color="#a855f7"
        distance={15}
        decay={2}
      />
      
      <pointLight
        position={[-3, 1, 3]}
        intensity={2}
        color="#ec4899"
        distance={12}
        decay={2}
      />
      
      <pointLight
        position={[0, -3, 2]}
        intensity={1.2}
        color="#06b6d4"
        distance={10}
        decay={2}
      />
      
      <pointLight
        position={[0, 3, 3]}
        intensity={1.5}
        color="#f0abfc"
        distance={12}
        decay={2}
      />
      
      <spotLight
        position={[2, 4, 5]}
        angle={0.5}
        penumbra={1}
        intensity={2}
        color="#ffffff"
        distance={20}
        decay={2}
      />

      <InnerCore isActive={isActive} isSpeaking={isSpeaking} audioLevel={audioLevel} />

      <Float
        speed={isActive ? 2.5 : 1.2}
        rotationIntensity={0.15}
        floatIntensity={0.25}
      >
        <Sphere ref={meshRef} args={[1, 128, 128]}>
          <MeshDistortMaterial
            ref={materialRef}
            map={gradientTexture}
            distort={baseDistort}
            speed={baseSpeed}
            roughness={0.08}
            metalness={0.7}
            envMapIntensity={1.8}
          />
        </Sphere>

        <ReflectiveShell isActive={isActive} isSpeaking={isSpeaking} audioLevel={audioLevel} />
        
        <GlassLayer isActive={isActive} isSpeaking={isSpeaking} audioLevel={audioLevel} />
        
        <FresnelGlow color="#a855f7" intensity={0.7} scale={1.08} />
        <FresnelGlow color="#ec4899" intensity={0.4} scale={1.12} />
        <FresnelGlow color="#06b6d4" intensity={0.25} scale={1.16} />
      </Float>

      <AuroraWisps isActive={isActive} isSpeaking={isSpeaking} audioLevel={audioLevel} />
      <EnergyParticles isActive={isActive} isSpeaking={isSpeaking} audioLevel={audioLevel} />
    </>
  );
}

interface MysticalOrb3DProps {
  size?: number;
  isActive?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
  className?: string;
}

export function MysticalOrb3D({
  size = 200,
  isActive = false,
  isSpeaking = false,
  audioLevel = 0,
  className = "",
}: MysticalOrb3DProps) {
  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 50 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: "transparent" }}
        dpr={[1, 2]}
      >
        <AnimatedOrb 
          isActive={isActive} 
          isSpeaking={isSpeaking} 
          audioLevel={audioLevel} 
        />
      </Canvas>
    </div>
  );
}
