
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
import { point3DToLatLon, fetchMissionAnalysis } from './missionApi'
import MissionPanel from './MissionPanel'
import HorizonSkyplot from './HorizonSkyplot'
import { useRef } from 'react'
import { computeSunPosition3D } from './missionApi'
import * as THREE from 'three'
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

function AdaptiveControls({ onScaleChange }) {
  const controlsRef = useRef()

  useFrame(({ camera, size }) => {
    if (!controlsRef.current) return

    const distance = camera.position.length()
    const altitude = Math.max(0.05, distance - MOON_RADIUS)

    // Vitesse de rotation adaptative
    controlsRef.current.rotateSpeed = Math.min(0.85, Math.max(0.08, altitude * 0.14))

    // Calcul de l'échelle réelle au niveau de la surface (1 unité 3D = 868.7 km)
    if (onScaleChange) {
      const fovRad = (camera.fov * Math.PI) / 180
      const worldHeightAtSurface = 2 * altitude * Math.tan(fovRad / 2)
      const kmPerPixel = (worldHeightAtSurface * 868.7) / size.height
      onScaleChange(kmPerPixel * 100)
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      zoomSpeed={0.8}
      minDistance={2.15}
      maxDistance={12}
      enableDamping={true}
      dampingFactor={0.08}
    />
  )
}

function LandingCrosshair({ lat, lon }) {
  const { position, quaternion } = useMemo(() => {
    const latRad = (lat * Math.PI) / 180
    const lonRad = (lon * Math.PI) / 180

    // Vecteur normal à la surface (même repère exact que point3DToLatLon)
    const nx = -Math.cos(latRad) * Math.cos(lonRad)
    const ny = Math.sin(latRad)
    const nz = Math.cos(latRad) * Math.sin(lonRad)

    const normal = new THREE.Vector3(nx, ny, nz).normalize()
    // Légèrement au-dessus du rayon (2.008) pour ne pas rentrer dans le relief 3D
    const pos = normal.clone().multiplyScalar(MOON_RADIUS + 0.008)

    // Oriente le viseur pour qu'il soit parfaitement plaqué tangentiellement au sol
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    )

    return { position: pos, quaternion: quat }
  }, [lat, lon])

  return (
    <group position={position} quaternion={quaternion}>
      {/* Anneau extérieur cyan */}
      <mesh>
        <ringGeometry args={[0.028, 0.036, 32]} />
        <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
      </mesh>
      {/* Barre horizontale de la croix */}
      <mesh>
        <planeGeometry args={[0.09, 0.006]} />
        <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
      </mesh>
      {/* Barre verticale de la croix */}
      <mesh>
        <planeGeometry args={[0.006, 0.09]} />
        <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Scene({ onSelectCoords, sunPosition, onScaleChange, lat, lon }) {
  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight 
        position={sunPosition || [5, 3, 5] } 
        intensity={sunPosition ? 2.6 : 2}
      />

      <Stars
        radius={100}
        depth={50}
        count={4000}
        factor={4}
        saturation={0}
        fade
      />

      <group
        onDoubleClick={(e) => {
          e.stopPropagation()
          console.log('1. DOUBLE-CLIC CAPTE ! Point 3D :', e.point)
          if (onSelectCoords) {
            const { lat, lon } = point3DToLatLon(e.point)
            console.log('2. COORDONNEES CALCULEES :', lat, lon)
            onSelectCoords(lat, lon)
          } else {
            console.log('ERREUR : onSelectCoords est vide (undefined)')
          }
        }}
      />

      <Moon />
      <DynamicTiles />
      <PolarCap north={false} />
      <PolarCap north={true} />
      <DynamicPolarTiles />
      <LandingCrosshair lat={lat} lon={lon} />

      <AdaptiveControls onScaleChange={onScaleChange} />
    </>
  )
}

function ScaleBar({ kmPer100Px }) {
  // Paliers ronds propres (en km)
  const paliers = [1000, 500, 250, 100, 50, 25, 10, 5]
  const niceKm = paliers.find((p) => p <= kmPer100Px * 1.3) || 5
  const widthPx = Math.round((niceKm / kmPer100Px) * 100)

  return (
    <div
      style={{
        position: 'fixed',
        top: '92px',
        right: '24px',
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#cbd5e1',
      }}
    >
      <span style={{ marginBottom: '3px', textShadow: '0 1px 4px #000' }}>
        {niceKm} km
      </span>
      <div
        style={{
          width: `${Math.min(180, Math.max(40, widthPx))}px`,
          height: '6px',
          borderLeft: '2px solid #38bdf8',
          borderRight: '2px solid #38bdf8',
          borderBottom: '2px solid #38bdf8',
          boxShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}
      />
    </div>
  )
}

export default function App() {
  const [lat, setLat] = useState(26.1322)
  const [lon, setLon] = useState(3.6339)
  const [debut, setDebut] = useState('2026-11-14')
  const [fin, setFin] = useState('2027-02-14')
  const [loading, setLoading] = useState(false)
  const [missionData, setMissionData] = useState(null)
  const [timeIndex, setTimeIndex] = useState(0)
  const [kmPer100Px, setKmPer100Px] = useState(500)

  const handleSelectSite = async (targetLat, targetLon) => {
    setLat(targetLat)
    setLon(targetLon)
    setLoading(true)
    try {
      const data = await fetchMissionAnalysis(targetLat, targetLon, debut, fin)
      setMissionData(data)
      setTimeIndex(0) // Reset time index when new data arrives
    } catch (err) {
      console.error(err)
      alert("Vérifie que ton serveur Python uvicorn tourne sur le port 8000.")
    } finally {
      setLoading(false)
    }
  }

  const sunPosition = useMemo(() => {
    const point = missionData?.timeline?.[timeIndex]
    if (!point) return null
    return computeSunPosition3D(lat, lon, point.soleil_az, point.soleil_el)
  }, [missionData, timeIndex, lat, lon])

  console.log('DEBUG LUMIERE -> timeIndex:', timeIndex, '| sunPosition:', sunPosition)

  return (
    <div className="app">
      <header className="header">
        <h1>CALLUNA</h1>
        <span>LUNAR NAVIGATION SYSTEM</span>
      </header>

      <ScaleBar kmPer100Px={kmPer100Px} />

      <MissionPanel
        lat={lat} setLat={setLat}
        lon={lon} setLon={setLon}
        debut={debut} setDebut={setDebut}
        fin={fin} setFin={setFin}
        loading={loading}
        onSelectSite={handleSelectSite}
        diagnostic={missionData?.diagnostic}
      />

      {missionData && (
        <HorizonSkyplot
          horizon360={missionData.horizon_360}
          timeline={missionData.timeline}
          timeIndex={timeIndex}
          setTimeIndex={setTimeIndex}
        />
      )}
      <div className="moon-container">
        <Canvas camera={{ position: [0, 0, 6] }}>
          <Suspense fallback={null}>
            <Scene onSelectCoords={handleSelectSite} sunPosition={sunPosition} onScaleChange={setKmPer100Px} lat={lat} lon={lon} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
