
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Raycaster, Sphere, Vector2, Vector3 } from 'three'
import { cartesianToLunar } from '../utils/lunarCoordinates'

// The radius of CALLUNA's Moon in Three.js units
const MOON_RADIUS = 2

export default function LunarCoordinates({ onChange }) {
  const raycaster = useRef(new Raycaster())
  const sphere = useRef(
    new Sphere(new Vector3(0, 0, 0), MOON_RADIUS)
  )

  const screenCenter = useRef(new Vector2(0, 0))
  const intersection = useRef(new Vector3())
  const lastUpdate = useRef(0)

  useFrame(({ camera }, delta) => {
    // Update coordinates about 10 times per second
    lastUpdate.current += delta
    if (lastUpdate.current < 0.1) return
    lastUpdate.current = 0

    // Shoot a ray through the centre of the screen
    raycaster.current.setFromCamera(
      screenCenter.current,
      camera
    )

    // Intersect with the mathematical lunar sphere
    const point = raycaster.current.ray.intersectSphere(
      sphere.current,
      intersection.current
    )

    if (!point) {
      onChange(null)
      return
    }

    onChange(cartesianToLunar(point))
  })

  return null
}
