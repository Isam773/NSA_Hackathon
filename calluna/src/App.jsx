
import { Canvas, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import { OrbitControls, Stars } from '@react-three/drei'
import './App.css'

function Moon() {
  const texture = useLoader(
    TextureLoader,
    '/textures/moon-global.jpg'
  )

  return (
    <mesh>
      <sphereGeometry args={[2, 128, 128]} />
      <meshStandardMaterial
        map={texture}
        roughness={1}
      />
    </mesh>
  )
}

function TestTile() {
  const texture = useLoader(
    TextureLoader,
    '/textures/test-tile.jpg'
  )

  const zoom = 3
  const row = 3
  const col = 4

  const columns = 2 ** (zoom + 1)
  const rows = 2 ** zoom

  const phiStart = (col / columns) * Math.PI * 2
  const phiLength = (1 / columns) * Math.PI * 2

  const thetaStart = (row / rows) * Math.PI
  const thetaLength = (1 / rows) * Math.PI

  return (
    <mesh>
      <sphereGeometry
        args={[
          2.003,
          32,
          32,
          phiStart,
          phiLength,
          thetaStart,
          thetaLength
        ]}
      />
      <meshStandardMaterial
        map={texture}
        roughness={1}
      />
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 3, 5]} intensity={2} />

      <Stars
        radius={100}
        depth={50}
        count={4000}
        factor={4}
        saturation={0}
        fade
      />

      <Moon />
      <TestTile />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        minDistance={2.5}
        maxDistance={12}
      />
    </>
  )
}

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>CALLUNA</h1>
        <span>LUNAR NAVIGATION SYSTEM</span>
      </header>

      <div className="moon-container">
        <Canvas camera={{ position: [0, 0, 6] }}>
          <Scene />
        </Canvas>
      </div>
    </div>
  )
}
