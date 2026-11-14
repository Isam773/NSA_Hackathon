
import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import {
  TextureLoader,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide,
  RepeatWrapping
} from 'three'
import './App.css'
import PolarCap from './components/PolarCap'
import DynamicPolarTiles from './components/DynamicPolarTiles'

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

  texture.wrapS = RepeatWrapping
  texture.needsUpdate = true

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

function selectTiles(zoom, cameraDirection, distance, cameraFov, aspect) {
  const columns = 2 ** (zoom + 1)
  const rows = 2 ** zoom

  const horizonAngle = Math.acos(
    Math.min(1, MOON_RADIUS / distance)
  )

  const verticalFov = cameraFov * Math.PI / 180

  const horizontalFov =
    2 * Math.atan(Math.tan(verticalFov / 2) * aspect)

  const viewAngle = Math.max(verticalFov, horizontalFov) / 2

  const tileMargin = Math.hypot(
    Math.PI / columns,
    Math.PI / (2 * rows)
  )

  // Preload a small additional area around the visible region
  const prefetchMargin = 5 * Math.PI / 180

  const maxAngle = Math.min(
    horizonAngle,
    viewAngle + Math.asin(
      Math.min(1, MOON_RADIUS / distance)
    )
  ) + tileMargin

  const candidates = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const direction = tileDirection(zoom, row, col)

      const angle = Math.acos(
        Math.max(-1, Math.min(1, direction.dot(cameraDirection)))
      )

      if (angle <= maxAngle + prefetchMargin) {
        candidates.push({ row, col, angle })
      }
    }
  }

  candidates.sort((a, b) => a.angle - b.angle)

  return candidates.slice(0, 48)
}


// Draw one complete resolution layer
function TileLayer({ zoom, direction, distance, fov, aspect }) {
  const tiles = useMemo(
    () => selectTiles(zoom, direction, distance, fov, aspect),
    [zoom, direction, distance, fov, aspect]
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
  const updateTimer = useRef(0)

  const [view, setView] = useState({
    direction: new Vector3(0, 0, 1),
    distance: 6,
    zoom: 2,
    col: -1,
    row: -1,
    fov: 50,
    aspect: 1
  })

  useFrame(({ camera }, delta) => {
    updateTimer.current += delta

    // Update tile selection approximately 7 times per second
    if (updateTimer.current < 0.15) return

    updateTimer.current = 0
    const distance = camera.position.length()
    const fov = camera.fov
    const aspect = camera.aspect
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
        previous.row === row &&
        previous.fov === fov &&
        previous.aspect === aspect
      ) {
        return previous
      }

      return {
        direction,
        distance,
        zoom,
        col,
        row,
        fov,
        aspect
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
          fov={view.fov}
          aspect={view.aspect}
        />
      )}

      {view.zoom >= 4 && (
        <TileLayer
          zoom={4}
          direction={view.direction}
          distance={view.distance}
          fov={view.fov}
          aspect={view.aspect}
        />
      )}

      {view.zoom >= 5 && (
        <TileLayer
          zoom={5}
          direction={view.direction}
          distance={view.distance}
          fov={view.fov}
          aspect={view.aspect}
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
      <PolarCap north={false} />
      <PolarCap north={true} />
      <DynamicPolarTiles />

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
