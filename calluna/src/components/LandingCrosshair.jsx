import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)

  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)

  return new THREE.Vector3(x, y, z)
}

export default function LandingCrosshair({ lat, lon, moonRadius = 2 }) {
  const svgRef = useRef()
  const numLat = lat === '' || lat === '-' ? 0 : Number(lat)
  const numLon = lon === '' || lon === '-' ? 0 : Number(lon)
  const safeLat = isNaN(numLat) ? 0 : numLat
  const safeLon = isNaN(numLon) ? 0 : numLon

  const { position, normal } = useMemo(() => {
    const pos = latLonToVector3(safeLat, safeLon, moonRadius)
    return { position: pos, normal: pos.clone().normalize() }
  }, [safeLat, safeLon, moonRadius])

  useFrame(({ camera }) => {
    if (!svgRef.current) return
    const toCamera = camera.position.clone().sub(position).normalize()
    // Visible tant que le point n'est pas franchement derrière la Lune
    const isVisible = normal.dot(toCamera) > -0.25
    svgRef.current.style.visibility = isVisible ? 'visible' : 'hidden'
  })

  return (
    <group position={position}>
      <Html center zIndexRange={[50, 20]} style={{ pointerEvents: 'none' }}>
        <svg
          ref={svgRef}
          width="34"
          height="34"
          viewBox="0 0 34 34"
          style={{ display: 'block' }}
        >
          <circle cx="17" cy="17" r="11" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <line x1="2" y1="17" x2="32" y2="17" stroke="#ef4444" strokeWidth="1.8" />
          <line x1="17" y1="2" x2="17" y2="32" stroke="#ef4444" strokeWidth="1.8" />
        </svg>
      </Html>
    </group>
  )
}