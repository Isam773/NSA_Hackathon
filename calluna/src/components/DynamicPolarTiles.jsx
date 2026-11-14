
import { useState } from 'react'
import { useFrame } from '@react-three/fiber'
import PolarTile from './PolarTile'

const R = 1737400
const ORIGIN = 1095930

const LEVELS = {
  3: { cols: 16, rows: 8, scale: 3822300.5022321376 },
  4: { cols: 32, rows: 16, scale: 1911150.2511160688 }
}

const MAX_POLAR_ANGLE = 15 * Math.PI / 180
const MAX_RADIUS = 2 * R * Math.tan(MAX_POLAR_ANGLE / 2)

function selectPolarTiles(north, zoom, direction) {
  const config = LEVELS[zoom]
  const tileWidth = 256 * config.scale * 0.00028

  // Latitude and longitude of the camera direction.
  const latitude = Math.asin(direction.y)
  const longitude = Math.atan2(direction.z, -direction.x)

  const poleAngle = north
    ? Math.PI / 2 - latitude
    : Math.PI / 2 + latitude

  // Don't load polar tiles when looking far from this pole.
  if (poleAngle > Math.PI * 65 / 180) return []

  // Project camera direction into the polar map.
  const focusAngle = Math.min(poleAngle, MAX_POLAR_ANGLE)
  const rho = 2 * R * Math.tan(focusAngle / 2)

  const focusX = -rho * Math.sin(longitude)
  const focusY = north
    ? rho * Math.cos(longitude)
    : -rho * Math.cos(longitude)

  const candidates = []

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const left = -ORIGIN + col * tileWidth
      const right = left + tileWidth
      const top = ORIGIN - row * tileWidth
      const bottom = top - tileWidth

      // Find the closest point of this tile to the pole.
      const nearestX = Math.max(left, Math.min(0, right))
      const nearestY = Math.max(bottom, Math.min(0, top))

      // Ignore tiles outside the useful polar cap.
      if (Math.hypot(nearestX, nearestY) > MAX_RADIUS) {
        continue
      }

      const centerX = (left + right) / 2
      const centerY = (top + bottom) / 2

      const distance = Math.hypot(
        centerX - focusX,
        centerY - focusY
      )

      candidates.push({ row, col, distance })
    }
  }

  candidates.sort((a, b) => a.distance - b.distance)

  // Limit the number of simultaneously displayed tiles.
  const limit = zoom === 3 ? 24 : 20

  return candidates.slice(0, limit).map(({ row, col }) => ({
    row,
    col
  }))
}

export default function DynamicPolarTiles() {
  const [view, setView] = useState({
    north3: [],
    south3: [],
    north4: [],
    south4: []
  })

  useFrame(({ camera }) => {
    const distance = camera.position.length()
    const direction = camera.position.clone().normalize()

    const level3 = distance < 3.5
    const level4 = distance < 2.7

    const next = {
      north3: level3
        ? selectPolarTiles(true, 3, direction)
        : [],
      south3: level3
        ? selectPolarTiles(false, 3, direction)
        : [],
      north4: level4
        ? selectPolarTiles(true, 4, direction)
        : [],
      south4: level4
        ? selectPolarTiles(false, 4, direction)
        : []
    }

    setView(previous => {
      const same = Object.keys(next).every(key =>
        JSON.stringify(previous[key]) === JSON.stringify(next[key])
      )

      return same ? previous : next
    })
  })

  return (
    <group>
      {view.south3.map(({ row, col }) => (
        <PolarTile
          key={`south-3-${row}-${col}`}
          north={false}
          zoom={3}
          row={row}
          col={col}
        />
      ))}

      {view.north3.map(({ row, col }) => (
        <PolarTile
          key={`north-3-${row}-${col}`}
          north={true}
          zoom={3}
          row={row}
          col={col}
        />
      ))}

      {view.south4.map(({ row, col }) => (
        <PolarTile
          key={`south-4-${row}-${col}`}
          north={false}
          zoom={4}
          row={row}
          col={col}
        />
      ))}

      {view.north4.map(({ row, col }) => (
        <PolarTile
          key={`north-4-${row}-${col}`}
          north={true}
          zoom={4}
          row={row}
          col={col}
        />
      ))}
    </group>
  )
}
