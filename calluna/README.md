# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# CALLUNA — Lunar Navigation UI

CALLUNA is an interactive lunar navigation application developed for the NASA Space Apps Challenge 2026. The goal is to explore the Moon, investigate potential landing sites, and eventually analyse terrain, sunlight, and Earth visibility.

## Technologies Used

| Tool | Purpose |
|---|---|
| **React** | Builds the user interface and manages application components. |
| **Vite** | Runs the local development server and builds the application. |
| **JavaScript (JSX)** | Implements the interface, camera logic, and tile selection. |
| **Three.js** | Creates the 3D Moon, spherical geometry, textures, and lighting. |
| **React Three Fiber** | Integrates Three.js into React. |
| **React Three Drei** | Provides camera controls (`OrbitControls`) and background stars. |
| **CSS** | Styles the application layout, header, and background. |
| **NASA Moon Trek WMTS API** | Supplies real lunar surface imagery at different resolutions. |
| **Python + Pillow** | Downloads and combines NASA image tiles into mosaics. |
| **VS Code** | Development environment. |

## Current UI Features

### Interactive 3D Moon
A spherical Moon rendered using Three.js, with mouse-controlled rotation and zoom.

### Global Lunar Imagery
A permanent global texture (`moon-global.jpg`) assembled from NASA Moon Trek imagery at level 2 (8 × 4 tiles).

### Adaptive Image Resolution
Higher-resolution NASA tiles load dynamically as the camera approaches the lunar surface.

- Level 2: permanent global imagery
- Levels 3–5: dynamically loaded regional imagery
- Lower-resolution imagery remains visible while new tiles load

### Lunar Polar Imagery
A separate south-polar mosaic (`moon-south-pole.png`) has been assembled from NASA's polar stereographic imagery.

A spherical-cap component has been prepared to project this imagery onto the south pole. Its visual alignment still needs testing.

## Main Project Files

- `src/App.jsx` — 3D Moon, camera, tile selection, and rendering logic.
- `src/App.css` — Interface styling.
- `src/index.css` — Global page styling.
- `public/textures/` — Lunar textures and mosaics.
- `download_south_pole.py` — Python script for assembling south-polar imagery.

## Running the Application

From the project directory:

```bash
npm install
npm run dev
```

Open the local address displayed in the terminal (usually `http://localhost:5173/`).

## Planned Improvements

- Verify and refine north/south polar imagery.
- Improve visible-tile selection and caching.
- Add geographic coordinates and landing-site selection.
- Display zoom scale in kilometres.
- Integrate LOLA elevation data for terrain analysis.
- Calculate sunlight and Earth communication visibility.
- Package CALLUNA as a desktop application using Electron.

## Architecture

**React UI → React Three Fiber → Three.js 3D Moon → NASA Moon Trek imagery**

CALLUNA currently runs locally in a browser during development. The long-term objective is a standalone desktop application.