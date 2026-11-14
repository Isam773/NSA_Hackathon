
import { Suspense, useMemo, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import {
  TextureLoader,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide
} from 'three'
import './App.css'

const MOON_RADIUS = 2

const NASA_URL =
  'https://trek.nasa.gov/tiles/Moon/EQ/' +
  'LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/' +
  'default/default028mm'

// Permanent global imagery
function Moon() {
  const texture = useLoader(
    TextureLoader,
    '/textures/moon-global.jpg'
  )

  return (
    <mesh>
      <sphereGeometry args={[MOON_RADIUS, 128, 128]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  )
}

// One regional NASA tile
function RegionalTile({ zoom, row, col }) {
  const columns = 2 ** (zoom + 1)
  const rows = 2 ** zoom

  const url = `${NASA_URL}/${zoom}/${row}/${col}.jpg`
  const texture = useLoader(TextureLoader, url)

  // Higher-resolution layers sit slightly farther out
  const radius = MOON_RADIUS + (zoom - 2) * 0.003

  return (
    <mesh>
      <sphereGeometry
        args={[
          radius,
          32,
          32,
          (col / columns) * Math.PI * 2,
          (1 / columns) * Math.PI * 2,
          (row / rows) * Math.PI,
          (1 / rows) * Math.PI
        ]}
      />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  )
}

// Determine the centre direction of a tile
function tileDirection(zoom, row, col) {
  const columns = 2 ** (zoom + 1)
  const rows = 2 ** zoom

  const phi = ((col + 0.5) / columns) * Math.PI * 2
  const theta = ((row + 0.5) / rows) * Math.PI

  return new Vector3(
    -Math.sin(theta) * Math.cos(phi),
    Math.cos(theta),
    Math.sin(theta) * Math.sin(phi)
  )
}

// Find tiles near the visible side of the Moon
function selectTiles(zoom, cameraDirection, distance) {
  const columns = 2 ** (zoom + 1)
  const rows = 2 ** zoom

  // Angular radius of the visible lunar surface
  const horizonAngle = Math.acos(
    Math.min(1, MOON_RADIUS / distance)
  )

  // Allow for tiles that cross the visible boundary
  const tileMargin = Math.hypot(
    Math.PI / columns,
    Math.PI / (2 * rows)
  )

  const candidates = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const direction = tileDirection(zoom, row, col)

      const angle = Math.acos(
        Math.max(
          -1,
          Math.min(1, direction.dot(cameraDirection))
        )
      )

      if (angle <= horizonAngle + tileMargin) {
        candidates.push({ row, col, angle })
      }
    }
  }

  // Limit simultaneous regional tile requests
  candidates.sort((a, b) => a.angle - b.angle)

  return candidates.slice(0, 48)
}

// Draw one complete resolution layer
function TileLayer({ zoom, direction, distance }) {
  const tiles = useMemo(
    () => selectTiles(zoom, direction, distance),
    [zoom, direction, distance]
  )

  return (
    <group>
      {tiles.map(({ row, col }) => (
        <Suspense
          key={`${zoom}-${row}-${col}`}
          fallback={null}
        >
          <RegionalTile
            zoom={zoom}
            row={row}
            col={col}
          />
        </Suspense>
      ))}
    </group>
  )
}

// Select imagery resolution from camera distance
function getZoomLevel(distance) {
  if (distance < 2.8) return 5
  if (distance < 3.6) return 4
  if (distance < 5.2) return 3

  return 2
}

function DynamicTiles() {
  const [view, setView] = useState({
    direction: new Vector3(0, 0, 1),
    distance: 6,
    zoom: 2,
    col: -1,
    row: -1
  })

  useFrame(({ camera }) => {
    const distance = camera.position.length()
    const direction = camera.position.clone().normalize()
    const zoom = getZoomLevel(distance)

    // Track camera direction using a fine angular grid
    const phi = (
      Math.atan2(direction.z, -direction.x) +
      Math.PI * 2
    ) % (Math.PI * 2)

    const theta = Math.acos(
      Math.max(-1, Math.min(1, direction.y))
    )

    const col = Math.floor(phi / (Math.PI * 2) * 128)
    const row = Math.floor(theta / Math.PI * 64)

    setView(previous => {
      if (
        previous.zoom === zoom &&
        previous.col === col &&
        previous.row === row
      ) {
        return previous
      }

      return {
        direction,
        distance,
        zoom,
        col,
        row
      }
    })
  })

  return (
    <group>
      {view.zoom >= 3 && (
        <TileLayer
          zoom={3}
          direction={view.direction}
          distance={view.distance}
        />
      )}

      {view.zoom >= 4 && (
        <TileLayer
          zoom={4}
          direction={view.direction}
          distance={view.distance}
        />
      )}

      {view.zoom >= 5 && (
        <TileLayer
          zoom={5}
          direction={view.direction}
          distance={view.distance}
        />
      )}
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
        enablePan={false}
        enableZoom={true}
        minDistance={2.15}
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
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
