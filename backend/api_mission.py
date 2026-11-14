from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from data.analyse_optimalite import analyser_site_complet_api

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Convertit récursivement tous les types NumPy (np.bool_, np.float64, etc.) en types Python purs
def nettoyer_pour_json(obj):
    if isinstance(obj, dict):
        return {k: nettoyer_pour_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [nettoyer_pour_json(v) for v in obj]
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    return obj

@app.get("/api/analyser")
def analyser_site(lat: float, lon: float, debut: str = "2026-11-14", fin: str = "2027-02-14"):
    df_brut, df_bilan, topo, diagnostic = analyser_site_complet_api(
        lon=lon, lat=lat, date_debut=debut, date_fin=fin
    )

    timeline = [
        {
            "date": str(row.iloc[0]),
            "soleil_az": float(row["Soleil_Azimut_deg"]),
            "soleil_el": float(row["Soleil_Elevation_deg"]),
            "soleil_ok": bool(row["Soleil_OK"]),
            "terre_az": float(row["Terre_Azimut_deg"]),
            "terre_el": float(row["Terre_Elevation_deg"]),
            "terre_ok": bool(row["Terre_OK"]),
        }
        for _, row in df_brut.iterrows()
    ]

    return nettoyer_pour_json({
        "diagnostic": diagnostic,
        "horizon_360": topo["horizon_360"],
        "timeline": timeline,
    })