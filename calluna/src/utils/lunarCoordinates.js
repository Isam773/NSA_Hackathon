import { MathUtils } from 'three'

export function cartesianToLunar(point) {
  const radius = point.length()

  if (radius === 0) return null

  const latitude = Math.asin(point.y / radius)

  // Reverse the 180-degree offset used in latLonToVector3
  const longitude = Math.atan2(point.z, -point.x) - Math.PI

  // Normalize longitude to [-180, 180)
  const normalizedLongitude =
    ((MathUtils.radToDeg(longitude) + 540) % 360) - 180

  return {
    latitude: MathUtils.radToDeg(latitude),
    longitude: normalizedLongitude
  }
}