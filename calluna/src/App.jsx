
import { Canvas, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import { OrbitControls, Stars } from '@react-three/drei'
import { Suspense, useState } from 'react'
import { useFrame } from '@react-three/fiber'
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


const TILE_ZOOM = 3
const TILE_COLUMNS = 2 ** (TILE_ZOOM + 1)
const TILE_ROWS = 2 ** TILE_ZOOM

function RegionalTile({ row, col }) {
  const url =
    `https://trek.nasa.gov/tiles/Moon/EQ/` +
    `LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/` +
    `default/default028mm/${TILE_ZOOM}/${row}/${col}.jpg`

  const texture = useLoader(TextureLoader, url)

  return (
    <mesh>
      <sphereGeometry
        args={[
          2.003,
          32,
          32,
          (col / TILE_COLUMNS) * Math.PI * 2,
          (1 / TILE_COLUMNS) * Math.PI * 2,
          (row / TILE_ROWS) * Math.PI,
          (1 / TILE_ROWS) * Math.PI
        ]}
      />
      <meshStandardMaterial
        map={texture}
        roughness={1}
      />
    </mesh>
  )
}

function getCameraTile(position) {
  // Direction from the Moon's centre toward the camera
  const direction = position.clone().normalize()

  // Three.js sphere longitude angle
  let phi = Math.atan2(direction.z, -direction.x)

  if (phi < 0) {
    phi += Math.PI * 2
  }

  // Angle measured downward from the north pole
  const theta = Math.acos(
    Math.max(-1, Math.min(1, direction.y))
  )

  const col = Math.min(
    TILE_COLUMNS - 1,
    Math.floor(phi / (Math.PI * 2) * TILE_COLUMNS)
  )

  const row = Math.min(
    TILE_ROWS - 1,
    Math.floor(theta / Math.PI * TILE_ROWS)
  )

  return { row, col }
}

function DynamicTiles() {
  const [centerTile, setCenterTile] = useState({
    row: 4,
    col: 4
  })

  useFrame(({ camera }) => {
    const next = getCameraTile(camera.position)

    setCenterTile(previous => {
      if (
        previous.row === next.row &&
        previous.col === next.col
      ) {
        return previous
      }

      return next
    })
  })

  const tiles = []

  // Select a 3 × 3 neighbourhood
  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      const row = centerTile.row + rowOffset

      // Longitude wraps around the Moon
      const col =
        (centerTile.col + colOffset + TILE_COLUMNS)
        % TILE_COLUMNS

      // Latitude does not wrap
      if (row < 0 || row >= TILE_ROWS) {
        continue
      }

      tiles.push({ row, col })
    }
  }

  return (
    <group>
      {tiles.map(({ row, col }) => (
        <Suspense fallback={null} key={`${row}-${col}`}>
          <RegionalTile row={row} col={col} />
        </Suspense>
      ))}
    </group>
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
      <DynamicTiles />

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
