import { useMemo, useRef } from 'react'
import { useLoader } from '@react-three/fiber'
import {
  TextureLoader,
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide
} from 'three'

const LUNAR_RADIUS_METERS = 1737400

export default function PolarCap({ north = false }) {
  const texture = useLoader(
    TextureLoader,
    north
      ? '/textures/moon-north-pole.png'
      : '/textures/moon-south-pole.png'
  )

  const geometry = useMemo(() => {
    const positions = []
    const uvs = []
    const indices = []
    const opacities = []

    const latitudeSegments = 80
    const longitudeSegments = 160

    // Covers the south pole down to latitude -60°
    const maxPolarAngle = Math.PI / 6

    // NASA's level-2 WMTS grid
    const mapWidth = 2048
    const mapHeight = 1024

    const topLeftX = -1095930
    const topLeftY = 1095930

    // Ground resolution from WMTS scale denominator
    const scaleDenominator = 7644601.004464275
    const metersPerPixel = scaleDenominator * 0.00028

    for (let i = 0; i <= latitudeSegments; i++) {
      const polarAngle =
        (i / latitudeSegments) * maxPolarAngle
      // Fade from -85° to -75°
      const fadeStart = 5 * Math.PI / 180
      const fadeEnd = 15 * Math.PI / 180

      const t = Math.max(
        0,
        Math.min(1, (polarAngle - fadeStart) / (fadeEnd - fadeStart))
      )

      // Smoothstep interpolation
      const opacity = 1 - t * t * (3 - 2 * t)

      const latitude = north
        ? Math.PI / 2 - polarAngle
        : -Math.PI / 2 + polarAngle

      // South-polar stereographic radius
      const rho =
        2 * LUNAR_RADIUS_METERS *
        Math.tan(polarAngle / 2)

      for (let j = 0; j <= longitudeSegments; j++) {
        const longitude =
          (j / longitudeSegments) * Math.PI * 2

        const radius = 2.012

        // Same sphere orientation as our global Moon
        const x =
          -radius * Math.cos(latitude) *
          Math.cos(longitude)

        const y =
          radius * Math.sin(latitude)

        const z =
          radius * Math.cos(latitude) *
          Math.sin(longitude)

        positions.push(x, y, z)
        opacities.push(opacity)

        // South-polar stereographic projection
        const projectedX = -rho * Math.sin(longitude)

        const projectedY = north
          ? rho * Math.cos(longitude)
          : -rho * Math.cos(longitude)

        const pixelX =
          (projectedX - topLeftX) / metersPerPixel

        const pixelY =
          (topLeftY - projectedY) / metersPerPixel

        const u = pixelX / mapWidth
        const v = 1 - pixelY / mapHeight

        uvs.push(u, v)
      }
    }

    for (let i = 0; i < latitudeSegments; i++) {
      for (let j = 0; j < longitudeSegments; j++) {
        const a = i * (longitudeSegments + 1) + j
        const b = a + longitudeSegments + 1

        indices.push(a, b, a + 1)
        indices.push(b, b + 1, a + 1)
      }
    }

    const result = new BufferGeometry()

    result.setAttribute(
      'position',
      new Float32BufferAttribute(positions, 3)
    )
    result.setAttribute(
      'opacity',
      new Float32BufferAttribute(opacities, 1)
    )

    result.setAttribute(
      'uv',
      new Float32BufferAttribute(uvs, 2)
    )

    result.setIndex(indices)
    result.computeVertexNormals()

    return result
  }, [north])
  const materialRef = useRef()

  const configureGradient = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      attribute float opacity;
      varying float vOpacity;`
    )

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vOpacity = opacity;`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying float vOpacity;`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `#include <opaque_fragment>
      diffuseColor.a *= vOpacity;
      gl_FragColor.a *= vOpacity;`
    )
  }
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        ref={materialRef}
        map={texture}
        color={north ? '#d0d0d0' : '#b8b8b8'}
        roughness={1}
        side={DoubleSide}
        transparent={true}
        depthWrite={false}
        onBeforeCompile={configureGradient}
      />
    </mesh>
  )
}