// Convertit un point 3D cliqué sur la sphère Three.js en Latitude / Longitude lunaires
export function point3DToLatLon(point) {
  const p = point.clone().normalize()

  const lat = Math.asin(
    Math.max(-1, Math.min(1, p.y))
  ) * (180 / Math.PI)

  // Correct the 180° offset
  const rawLon = Math.atan2(p.z, -p.x) * (180 / Math.PI)

  const lon = ((rawLon + 180) % 360 + 360) % 360 - 180

  return {
    lat: Number(lat.toFixed(4)),
    lon: Number(lon.toFixed(4)),
  }
}

// Interroge ton backend FastAPI (port 8000)
export async function fetchMissionAnalysis(lat, lon, debut, fin) {
  const url = `http://127.0.0.1:8000/api/analyser?lat=${lat}&lon=${lon}&debut=${debut}&fin=${fin}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Erreur serveur (${response.status})`)
  }
  return await response.json()
}

// Calcule la position 3D [x, y, z] du Soleil dans le repère Three.js de la Lune
// à partir des coordonnées du site (lat, lon) et de l'azimut/élévation locaux du Soleil
export function computeSunPosition3D(siteLatDeg, siteLonDeg, soleilAzDeg, soleilElDeg) {
  const lat = (siteLatDeg * Math.PI) / 180
  const lon = ((siteLonDeg + 180) * Math.PI) / 180
  const az = (soleilAzDeg * Math.PI) / 180
  const el = (soleilElDeg * Math.PI) / 180

  // Vecteur Up (normal à la surface au point d'atterrissage, même repère que App.jsx)
  const upX = -Math.cos(lat) * Math.cos(lon)
  const upY = Math.sin(lat)
  const upZ = Math.cos(lat) * Math.sin(lon)

  // Vecteur Nord local (tangent vers le pôle Nord)
  const northX = Math.sin(lat) * Math.cos(lon)
  const northY = Math.cos(lat)
  const northZ = -Math.sin(lat) * Math.sin(lon)

  // Vecteur Est local (produit vectoriel Nord x Up)
  const eastX = northY * upZ - northZ * upY
  const eastY = northZ * upX - northX * upZ
  const eastZ = northX * upY - northY * upX

  // Direction du Soleil dans le repère local (Est, Nord, Haut)
  const cosEl = Math.cos(el)
  const sEast = cosEl * Math.sin(az)
  const sNorth = cosEl * Math.cos(az)
  const sUp = Math.sin(el)

  // Conversion vers le repère global de la Lune Three.js (éloigné à distance 15)
  const dist = 15
  const x = (sEast * eastX + sNorth * northX + sUp * upX) * dist
  const y = (sEast * eastY + sNorth * northY + sUp * upY) * dist
  const z = (sEast * eastZ + sNorth * northZ + sUp * upZ) * dist

  return [x, y, z]
}