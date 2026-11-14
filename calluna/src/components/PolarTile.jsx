
import { useEffect, useMemo, useState } from 'react'
import {
  BufferGeometry,
  Float32BufferAttribute,
  TextureLoader,
  DoubleSide
} from 'three'

const R = 1737400
const ORIGIN = 1095930
const TILE_SIZE = 256

const SCALES = {
  3: 3822300.5022321376,
  4: 1911150.2511160688
}

// Reuse downloaded textures and remember unavailable tiles.
const tileCache = new Map()
const loader = new TextureLoader()

function loadTile(url) {
  if (!tileCache.has(url)) {
    const promise = new Promise(resolve => {
      loader.load(
        url,
        texture => resolve(texture),
        undefined,
        () => resolve(null)
      )
    })
    tileCache.set(url, promise)
  }

  return tileCache.get(url)
}

function polarGradient(shader) {
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
     gl_FragColor.a *= vOpacity;`
  )
}

export default function PolarTile({
  north = false,
  zoom = 3,
  row,
  col
}) {
  const [texture, setTexture] = useState(null)

  const region = north ? 'NP' : 'SP'
  const dataset = north
    ? 'LRO_WAC_Mosaic_NPole60_100mp'
    : 'LRO_WAC_Mosaic_SPole60_100mp'

  const url =
    `https://trek.nasa.gov/tiles/Moon/${region}/` +
    `${dataset}/1.0.0/default/default028mm/` +
    `${zoom}/${row}/${col}.png`

  useEffect(() => {
    let active = true
    setTexture(null)

    loadTile(url).then(result => {
      if (active) setTexture(result)
    })

    return () => {
      active = false
    }
  }, [url])

  const geometry = useMemo(() => {
    const positions = []
    const uvs = []
    const opacities = []
    const indices = []

    const segments = 24
    const metresPerPixel = SCALES[zoom] * 0.00028
    const tileWidth = TILE_SIZE * metresPerPixel

    const left = -ORIGIN + col * tileWidth
    const top = ORIGIN - row * tileWidth

    // Higher-resolution tiles sit above lower-resolution tiles.
    const radius = zoom === 3 ? 2.015 : 2.018

    for (let iy = 0; iy <= segments; iy++) {
      for (let ix = 0; ix <= segments; ix++) {
        const u = ix / segments
        const v = iy / segments

        const px = left + u * tileWidth
        const py = top - v * tileWidth

        const rho = Math.hypot(px, py)
        const angle = 2 * Math.atan(rho / (2 * R))

        const latitude = north
          ? Math.PI / 2 - angle
          : -Math.PI / 2 + angle

        // Same orientation as the working PolarCap.
        const longitude = north
          ? Math.atan2(-px, py)
          : Math.atan2(-px, -py)

        positions.push(
          -radius * Math.cos(latitude) * Math.cos(longitude),
          radius * Math.sin(latitude),
          radius * Math.cos(latitude) * Math.sin(longitude)
        )

        uvs.push(u, 1 - v)

        // Match the existing polar-cap gradient:
        // full opacity to 85°, fade out at 75°.
        const start = 5 * Math.PI / 180
        const end = 15 * Math.PI / 180
        const t = Math.max(
          0,
          Math.min(1, (angle - start) / (end - start))
        )

        opacities.push(1 - t * t * (3 - 2 * t))
      }
    }

    for (let iy = 0; iy < segments; iy++) {
      for (let ix = 0; ix < segments; ix++) {
        const a = iy * (segments + 1) + ix
        const b = a + segments + 1

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
      'uv',
      new Float32BufferAttribute(uvs, 2)
    )
    result.setAttribute(
      'opacity',
      new Float32BufferAttribute(opacities, 1)
    )

    result.setIndex(indices)
    result.computeVertexNormals()

    return result
  }, [north, zoom, row, col])

  useEffect(() => {
    return () => geometry.dispose()
  }, [geometry])

  if (!texture) return null

  return (
    <mesh geometry={geometry} renderOrder={zoom}>
      <meshStandardMaterial
        map={texture}
        color={north ? '#d0d0d0' : '#b8b8b8'}
        roughness={1}
        side={DoubleSide}
        transparent={true}
        depthWrite={false}
        onBeforeCompile={polarGradient}
      />
    </mesh>
  )
}
