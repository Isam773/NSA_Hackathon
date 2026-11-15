# CALLUNA — Frontend Documentation

The CALLUNA frontend is an interactive lunar exploration interface developed with React and Three.js.

It allows users to navigate a 3D Moon, select landing sites, visualise lunar imagery, and interact with mission analysis results calculated by the Python backend.

For installation and general usage, see the main `README.md` at the project root.

---

## 1. Technologies

| Technology | Purpose |
|---|---|
| React 19 | Interface components and application state |
| Vite 8 | Development server and production build |
| Three.js | 3D lunar globe, geometry, textures, and lighting |
| React Three Fiber | Integration of Three.js with React |
| React Three Drei | Camera controls and star background |
| JavaScript / JSX | Application logic |
| CSS | Interface styling |
| NASA Moon Trek WMTS | High-resolution lunar imagery |
| FastAPI | Backend mission analysis |

The frontend runs in a browser and communicates with the backend through HTTP requests.

The production build is stored in `dist/` and is served directly by FastAPI.

## 2. Project Structure

```text
calluna/
├── public/
│   └── textures/
│       ├── moon-global.jpg
│       ├── moon-north-pole.png
│       ├── moon-south-pole.png
│       └── zoom2/
│
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   ├── main.jsx
│   ├── MissionPanel.jsx
│   ├── HorizonSkyplot.jsx
│   ├── missionApi.js
│   │
│   ├── components/
│   │   ├── PolarCap.jsx
│   │   ├── PolarTile.jsx
│   │   ├── DynamicPolarTiles.jsx
│   │   ├── LandingCrosshair.jsx
│   │   └── LunarCoordinates.jsx
│   │
│   └── utils/
│       └── lunarCoordinates.js
│
├── dist/
├── package.json
└── vite.config.js
```

### Main files

**`App.jsx`**

Central component responsible for application state, the Three.js scene, camera controls, imagery loading, lighting, and interactions.

**`MissionPanel.jsx`**

Contains the landing-site controls, coordinate inputs, mission dates, analysis results, and adjustable mission thresholds.

**`HorizonSkyplot.jsx`**

Displays the local terrain horizon, Sun/Earth positions, and mission timeline.

**`missionApi.js`**

Handles communication with FastAPI and provides coordinate and Sun-position calculations.

**`components/`**

Contains reusable 3D components, particularly polar imagery and landing-site markers.

---

## 3. Frontend Architecture

The interface is organised around a central React component and a Three.js scene.

```text
App.jsx
│
├── MissionPanel
│   ├── Coordinates
│   ├── Mission dates
│   ├── Analysis button
│   ├── Results
│   └── Mission thresholds
│
├── HorizonSkyplot
│   ├── Terrain horizon
│   ├── Sun/Earth positions
│   └── Timeline controls
│
└── Canvas (React Three Fiber)
    ├── Moon
    ├── DynamicTiles
    ├── PolarCap (North)
    ├── PolarCap (South)
    ├── DynamicPolarTiles
    ├── LandingCrosshair
    ├── AdaptiveControls
    ├── Stars
    └── Lighting
```

React manages the application state and interface, while Three.js renders the lunar globe.

The backend performs the scientific calculations independently.

## 4. Lunar Globe and Imagery

### Global Moon

The Moon is represented by a sphere with a radius of **2 Three.js units**.

The underlying global texture is:

`public/textures/moon-global.jpg`

This texture provides a complete lunar surface image while additional imagery loads.

### Dynamic image tiles

CALLUNA retrieves imagery from NASA Moon Trek using the Web Map Tile Service (WMTS).

Global imagery endpoint:

```text
https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{zoom}/{row}/{col}.jpg
```

The system selects imagery according to camera distance and viewing direction.

As users zoom in:

1. CALLUNA determines the required imagery resolution.
2. It identifies relevant tiles near the visible region.
3. The corresponding NASA images are requested.
4. Higher-resolution tiles appear over the global texture.
5. Lower-resolution imagery remains available while new tiles load.

The current implementation uses imagery levels 2–5.

The globe is image-based: **terrain elevation is not applied to the global sphere geometry**.

### Polar imagery

Equirectangular imagery becomes distorted near the lunar poles.

CALLUNA therefore uses separate polar stereographic imagery for the north and south poles.

The main components are:

- `PolarCap.jsx` — Polar base imagery and blending.
- `PolarTile.jsx` — Individual higher-resolution polar tiles.
- `DynamicPolarTiles.jsx` — Tile selection and loading.

`PolarCap.jsx` generates custom `BufferGeometry` with UV coordinates calculated from the polar stereographic projection.

A shader-based opacity gradient blends polar imagery into the surrounding global imagery.

The transition fades approximately between **75° and 85° latitude**.

This improves visual continuity between different map projections.

Some seams and contrast differences may remain visible.

---

## 5. Lunar Coordinate System

CALLUNA uses lunar latitude and longitude to locate landing sites.

The Three.js coordinate system is:

- **X and Z:** Equatorial plane
- **Y:** Lunar north/south direction
- **Origin:** Centre of the Moon
- **Sphere radius:** 2 scene units

A geographic position is converted into a 3D surface direction.

The active implementation includes a **180° longitude correction** to align geographic coordinates with the displayed NASA imagery.

For example, the camera-navigation direction is calculated using:

```javascript
const latRad = lat * Math.PI / 180
const lonRad = (lon + 180) * Math.PI / 180

const direction = new THREE.Vector3(
  -Math.cos(latRad) * Math.cos(lonRad),
   Math.sin(latRad),
   Math.cos(latRad) * Math.sin(lonRad)
)
```

**Important:** The longitude offset is intentional. Removing it without updating the corresponding inverse transformations would cause coordinate misalignment.

### Double-click selection

A double-click on the lunar surface triggers a React Three Fiber event.

The process is:

```text
Double-click
    ↓
Three.js intersection point
    ↓
point3DToLatLon()
    ↓
Latitude / longitude
    ↓
Update selected site
    ↓
Move landing crosshair
```

The coordinate conversion is implemented in `missionApi.js`.

The double-click handler is attached to the imagery group so that clicks on different imagery layers are recognised.

Double-clicking **does not automatically request a new analysis**.

### Landing crosshair

`LandingCrosshair.jsx` displays a marker at the selected location.

The marker is positioned slightly above the lunar sphere to remain visible over the imagery.

### Camera controls

`AdaptiveControls` manages orbiting, zooming, and navigation toward selected coordinates.

It also adapts camera movement near the surface and supplies an approximate scale indicator.

---

## 6. React State Management

The principal application state is managed in `App.jsx`.

| State | Purpose |
|---|---|
| `lat`, `lon` | Currently selected coordinates |
| `debut`, `fin` | Mission date range |
| `loading` | Analysis request status |
| `missionData` | Backend analysis results |
| `timeIndex` | Selected timeline sample |
| `analysedSite` | Coordinates associated with the last successful analysis |
| `sunPosition` | Current stored Sun direction |
| `kmPer100Px` | Approximate map scale |

### Selected site vs analysed site

CALLUNA distinguishes between the location currently selected by the user and the location for which analysis results were calculated.

This distinction prevents old analysis data from being incorrectly associated with new coordinates.

When the user double-clicks another location:

- Selected coordinates change.
- The landing crosshair moves.
- Previous mission results are cleared.
- The Sun's last position can remain unchanged.

When the user clicks the analysis button:

- The frontend requests new data from FastAPI.
- The analysed coordinates are saved.
- New results are displayed.
- The mission timeline resets to its first sample.

### Sun lighting

The Sun's 3D direction is calculated using:

`computeSunPosition3D()`

This function converts the Sun's local azimuth and elevation into a direction in the Three.js coordinate system.

The calculated position is used by the scene's directional light.

The Sun is updated when the mission timeline changes.

The visual lighting is illustrative and does not reproduce detailed terrain shadows.

---

## 7. Mission Analysis Interface

### MissionPanel

The Mission Planner allows users to:

- Enter lunar coordinates.
- Select predefined landing sites.
- Choose mission dates.
- Launch an analysis.
- Read mission diagnostics.
- Modify mission thresholds.

Dates are displayed in `DD/MM/YYYY` format and converted to `YYYY-MM-DD` for API requests.

### HorizonSkyplot

`HorizonSkyplot.jsx` displays a local sky chart using SVG.

It visualises the surrounding terrain horizon and the Sun/Earth directions for the selected timeline sample.

The timeline slider updates the displayed astronomical positions and the Moon's lighting.

### Mission thresholds

The frontend supports adjustable mission criteria and predefined profiles.

These thresholds are evaluated locally against the returned mission metrics.

Changing them does not automatically rerun the backend calculations.

**Known issue:** The frontend's maximum-night criterion uses `nuit_max_days`, while the backend returns `nuit_max_jours`. These names should be made consistent.

---

## 8. Backend Communication

The frontend communicates with FastAPI through `fetchMissionAnalysis()` in `missionApi.js`.

Endpoint:

```text
GET http://127.0.0.1:8000/api/analyser
```

Parameters:

```text
lat   = Lunar latitude
lon   = Lunar longitude
debut = Mission start date
fin   = Mission end date
```

Example:

```text
http://127.0.0.1:8000/api/analyser?lat=0.6741&lon=23.4730&debut=2026-11-14&fin=2026-11-28
```

The response contains three principal objects:

```json
{
  "diagnostic": {},
  "horizon_360": {},
  "timeline": []
}
```

- `diagnostic` contains terrain and mission suitability metrics.
- `horizon_360` contains the surrounding terrain horizon for 360 azimuth directions.
- `timeline` contains Sun/Earth positions and visibility results over time.

See `backend/README.md` for details.

---

## 9. Development

### Requirements

Developers need Node.js and npm.

From the `calluna` directory:

```bash
npm install
npm run dev
```

The Vite development server typically runs at:

`http://localhost:5173`

The Python backend must also be running on port 8000 for mission analysis to work.

### Production build

```bash
npm run build
```

This generates the compiled frontend in:

`calluna/dist/`

FastAPI serves these files when CALLUNA is launched through `Lancer_Calluna.bat`.

### Additional commands

```bash
npm run lint
npm run preview
```

---

## 10. Known Limitations

- Imagery loading depends partly on NASA's online services.
- Some seams may be visible between image tiles or projection layers.
- The scale indicator is approximate.
- Global terrain is represented visually through imagery, not displaced 3D geometry.

---

## 11. AI Usage Disclosure

**The CALLUNA frontend was developed with generative AI assistance, including ChatGPT.**

AI tools contributed to code generation, React integration, Three.js rendering, coordinate transformations, debugging, and documentation.

All frontend source files should be considered AI-assisted.

The development team directed the implementation, integrated the components, tested functionality, and refined the application.