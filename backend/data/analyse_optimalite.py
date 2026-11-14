import os
import pandas as pd

# Import des deux autres modules du dossier data/
from data.analyse_topographie import (
    calculer_masque_horizon_lola,
    filtrer_visibilite_avec_relief,
)
from data.extraction_horizons import (
    demander_parametres_mission,
    recuperer_donnees_completes,
)

CHEMIN_LOLA_IMG = "data/ldem_16.img"
PIXELS_PAR_DEGRE = 16  # Passer à 64 si tu utilises ldem_64.img


def calculer_bilan_15_jours_avec_relief(df_brut, pas_heures=6):
  """Calcule les statistiques par tranches de 15 jours en utilisant les colonnes

  'Soleil_OK', 'Terre_OK' et 'Les_Deux_OK' déjà filtrées par le relief réel.
  """
  df = df_brut.copy()
  if "Date_UTC" in df.columns:
        col_date = df["Date_UTC"]
  elif "Date" in df.columns:
        col_date = df["Date"]
  else:
        col_date = df.iloc[:, 0] if not isinstance(df.index, pd.DatetimeIndex) else df.index

  df["Date_dt"] = pd.to_datetime(col_date, format="mixed")
  date_debut = df["Date_dt"].min()
  
  df["Bloc_15j"] = ((df["Date_dt"] - date_debut).dt.days // 15) + 1

  jours_par_releve = pas_heures / 24.0
  bilan_liste = []

  for bloc, groupe in df.groupby("Bloc_15j"):
    d_min = groupe["Date_dt"].min().strftime("%Y-%m-%d")
    d_max = groupe["Date_dt"].max().strftime("%Y-%m-%d")
    jours_analyses = round(len(groupe) * jours_par_releve, 1)

    j_soleil = round(groupe["Soleil_OK"].sum() * jours_par_releve, 1)
    j_terre = round(groupe["Terre_OK"].sum() * jours_par_releve, 1)
    j_sim = round(groupe["Les_Deux_OK"].sum() * jours_par_releve, 1)

    bilan_liste.append({
        "Periode_15j": f"Bloc {bloc} ({d_min} au {d_max})",
        "Jours_Analyses": jours_analyses,
        "Jours_Soleil": j_soleil,
        "Freq_Soleil_%": round((groupe["Soleil_OK"].mean()) * 100, 1),
        "Jours_Com_Terre": j_terre,
        "Freq_Com_%": round((groupe["Terre_OK"].mean()) * 100, 1),
        "Jours_Simultanes": j_sim,
        "Freq_Simultane_%": round((groupe["Les_Deux_OK"].mean()) * 100, 1),
        "Elev_Soleil_Max": round(groupe["Soleil_Elevation_deg"].max(), 2),
        "Elev_Terre_Max": round(groupe["Terre_Elevation_deg"].max(), 2),
    })

  return pd.DataFrame(bilan_liste)


def calculer_nuit_maximale_continue(df_brut, pas_heures=6):
  """Calcule la durée maximale (en jours) passée à l'ombre des cratères ou de la nuit."""
  nuit_actuelle_h = 0
  nuit_max_h = 0

  for soleil_visible in df_brut["Soleil_OK"]:
    if not soleil_visible:
      nuit_actuelle_h += pas_heures
      if nuit_actuelle_h > nuit_max_h:
        nuit_max_h = nuit_actuelle_h
    else:
      nuit_actuelle_h = 0

  return round(nuit_max_h / 24, 1)


def evaluer_criteres_mission(
    df_brut,
    df_bilan,
    topo,
    pas_heures=6,
    requis_soleil_pct=65.0,
    requis_com_pct=25.0,
    requis_sim_pct=15.0,
    nuit_max_toleree_jours=4.0,
    pente_max_toleree_deg=15.0,
):
  """Évalue factuellement toutes les contraintes physiques (Énergie, Radio, Relief, Pente)."""
  freq_soleil_moy = round(df_bilan["Freq_Soleil_%"].mean(), 1)
  freq_com_moy = round(df_bilan["Freq_Com_%"].mean(), 1)
  freq_sim_moy = round(df_bilan["Freq_Simultane_%"].mean(), 1)

  jours_soleil_total = round(df_bilan["Jours_Soleil"].sum(), 1)
  jours_com_total = round(df_bilan["Jours_Com_Terre"].sum(), 1)
  jours_sim_total = round(df_bilan["Jours_Simultanes"].sum(), 1)
  jours_mission_total = round(df_bilan["Jours_Analyses"].sum(), 1)

  # Calcul exact des jours perdus uniquement à cause du relief (quand l'astre est > 0° mais caché par un cratère)
  jours_soleil_theorique = round((df_brut["Soleil_Elevation_deg"] > 0).sum() * (pas_heures / 24.0), 1)
  jours_terre_theorique = round((df_brut["Terre_Elevation_deg"] > 0).sum() * (pas_heures / 24.0), 1)

  perte_soleil_relief_j = round(jours_soleil_theorique - jours_soleil_total, 1)
  perte_terre_relief_j = round(jours_terre_theorique - jours_com_total, 1)

  nuit_max_jours = calculer_nuit_maximale_continue(
      df_brut, pas_heures=pas_heures
  )
  pente_deg = topo["pente_locale_deg"]
  horizon_max_deg = max(topo["horizon_360"].values())

  # Critères booléens factuels
  energie_ok = freq_soleil_moy >= requis_soleil_pct
  survie_nuit_ok = nuit_max_jours <= nuit_max_toleree_jours
  com_ok = freq_com_moy >= requis_com_pct
  simultane_ok = freq_sim_moy >= requis_sim_pct
  atterrissage_ok = pente_deg <= pente_max_toleree_deg

  if (
      energie_ok
      and survie_nuit_ok
      and com_ok
      and simultane_ok
      and atterrissage_ok
  ):
    statut_global = "VIABLE (Toutes les contraintes physiques sont respectées)"
  elif not atterrissage_ok:
    statut_global = (
        f"DANGER ATTERRISSAGE (Pente trop forte : {pente_deg}° >"
        f" {pente_max_toleree_deg}°)"
    )
  elif not energie_ok or not survie_nuit_ok:
    statut_global = (
        "NON VIABLE ÉNERGÉTIQUEMENT (Ombre des cratères ou nuit trop longue)"
    )
  elif not com_ok:
    statut_global = "NON VIABLE RADIO (Liaison directe Terre insuffisante)"
  else:
    statut_global = (
        "CONTRAINT (Ajustements opérationnels ou matériels nécessaires)"
    )

  return {
      "statut_global": statut_global,
      "criteres_valides": {
          "atterrissage_ok": atterrissage_ok,
          "energie_ok": energie_ok,
          "survie_nuit_ok": survie_nuit_ok,
          "com_ok": com_ok,
          "simultane_ok": simultane_ok,
      },
      "donnees_factuelles": {
          "altitude_site_m": topo["altitude_site_m"],
          "pente_locale_deg": pente_deg,
          "horizon_max_deg": horizon_max_deg,
          "perte_soleil_relief_j": perte_soleil_relief_j,
          "perte_terre_relief_j": perte_terre_relief_j,
          "jours_mission_total": jours_mission_total,
          "jours_soleil_total": jours_soleil_total,
          "freq_soleil_moy": freq_soleil_moy,
          "nuit_max_jours": nuit_max_jours,
          "jours_com_total": jours_com_total,
          "freq_com_moy": freq_com_moy,
          "jours_sim_total": jours_sim_total,
          "freq_sim_moy": freq_sim_moy,
          "elev_soleil_max": round(df_bilan["Elev_Soleil_Max"].max(), 2),
          "elev_terre_max": round(df_bilan["Elev_Terre_Max"].max(), 2),
          "delai_radio_moy": round(df_brut["Delai_Radio_sec"].mean(), 3),
      },
      "seuils_mission": {
          "pente_max_toleree_deg": pente_max_toleree_deg,
          "requis_soleil_pct": requis_soleil_pct,
          "requis_com_pct": requis_com_pct,
          "requis_sim_pct": requis_sim_pct,
          "nuit_max_toleree_jours": nuit_max_toleree_jours,
      },
  }


def afficher_rapport_diagnostic(resultats):
  """Affiche le rapport complet combinant topographie LOLA et éphémérides NASA."""
  faits = resultats["donnees_factuelles"]
  req = resultats["seuils_mission"]
  ok = resultats["criteres_valides"]

  print(
      "\n====================================================================="
  )
  print(
      "           DIAGNOSTIC COMPLET (TOPOGRAPHIE LOLA + HORIZONS)          "
  )
  print(
      "====================================================================="
  )
  print(f"STATUT GLOBAL : {resultats['statut_global']}")
  print(
      "---------------------------------------------------------------------"
  )

  print("\n1. TOPOGRAPHIE & SÉCURITÉ D'ATTERRISSAGE")
  print(f"   • Altitude réelle LOLA    : {faits['altitude_site_m']} m")
  print(
      f"   • Pente locale estimée    : {faits['pente_locale_deg']}° [Max"
      f" toléré : <= {req['pente_max_toleree_deg']}°]"
  )
  print(
      f"   • Obstacle horizon max    : {faits['horizon_max_deg']}° (cratères"
      " / montagnes environnantes)"
  )
  print(f"   • Masquage par le relief  : -{faits['perte_soleil_relief_j']}j de Soleil | -{faits['perte_terre_relief_j']}j de liaison Terre")
  if not ok["atterrissage_ok"]:
    print(
        "   -> ALERTE : Terrain trop incliné, risque critique de basculement"
        " du module."
    )
  else:
    print("   -> CONFORME : Pente compatible avec un atterrissage stabilisé.")

  print("\n2. ÉNERGIE & SURVIE THERMIQUE (AVEC MASQUE DES CRATÈRES)")
  print(
      f"   • Ensoleillement réel     : {faits['freq_soleil_moy']}%"
      f" ({faits['jours_soleil_total']}j sur {faits['jours_mission_total']}j)"
      f" [Requis : >= {req['requis_soleil_pct']}%]"
  )
  print(
      f"   • Ombre/Nuit continue max : {faits['nuit_max_jours']} jours"
      f" [Autonomie batterie : <= {req['nuit_max_toleree_jours']} jours]"
  )
  if not ok["energie_ok"] or not ok["survie_nuit_ok"]:
    print(
        "   -> ALERTE : Le relief ou le cycle lunaire prive la base de"
        " lumière trop longtemps."
    )
    print(
        "      Risque d'épuisement des batteries et de gel des instruments"
        " (-180°C)."
    )
  else:
    print(
        "   -> CONFORME : Apport solaire réel suffisant malgré le relief"
        " environnant."
    )

  print("\n3. LIAISON RADIO DIRECTE TERRE & OPÉRATIONS SIMULTANÉES")
  print(
      f"   • Visibilité Terre réelle : {faits['freq_com_moy']}%"
      f" ({faits['jours_com_total']}j cumulés) [Requis : >="
      f" {req['requis_com_pct']}%]"
  )
  print(
      f"   • Simultanéité réelle     : {faits['freq_sim_moy']}%"
      f" ({faits['jours_sim_total']}j cumulés) [Requis : >="
      f" {req['requis_sim_pct']}%]"
  )
  print(f"   • Latence radio moyenne   : {faits['delai_radio_moy']} s (aller simple)")
  if not ok["com_ok"]:
    print(
        "   -> ALERTE : Fenêtres radio insuffisantes (un satellite relais en"
        " orbite est requis)."
    )
  print(
      "=====================================================================\n"
  )


def analyser_site_complet_api(lon, lat, date_debut, date_fin):
  """Pipeline complet prêt pour l'interface web 3D :

  1. Lit l'altitude, la pente et les montagnes sur 360° dans LOLA
  2. Interroge NASA Horizons avec l'altitude exacte trouvée
  3. Croise les trajectoires Soleil/Terre avec les cratères alentours
  4. Produit le bilan 15j et le diagnostic factuel
  """
  # 1. Topographie LOLA
  topo = calculer_masque_horizon_lola(
      chemin_img=CHEMIN_LOLA_IMG,
      lat=lat,
      lon=lon,
      pixels_par_degre=PIXELS_PAR_DEGRE,
  )

  # 2. Éphémérides NASA Horizons (utilise directement l'altitude LOLA en km)
  df_brut = recuperer_donnees_completes(
      lon=lon,
      lat=lat,
      alt=topo["altitude_site_km"],
      date_debut=date_debut,
      date_fin=date_fin,
      pas="6h",
  )

  # 3. Croisement trajectoires vs relief des cratères
  df_brut = filtrer_visibilite_avec_relief(df_brut, topo["horizon_360"])

  # 4. Bilan par tranches de 15 jours et diagnostic
  df_bilan = calculer_bilan_15_jours_avec_relief(df_brut, pas_heures=6)
  diagnostic = evaluer_criteres_mission(df_brut, df_bilan, topo, pas_heures=6)

  return df_brut, df_bilan, topo, diagnostic


# ==============================================================================
# EXÉCUTION PRINCIPALE
# ==============================================================================
if __name__ == "__main__":
  # On demande les paramètres à l'utilisateur (tu peux ignorer l'altitude saisie puisqu'on prend celle de LOLA)
  lon, lat, d_debut, d_fin = demander_parametres_mission()

  df_brut, df_bilan, topo, diagnostic = analyser_site_complet_api(
      lon=lon, lat=lat, date_debut=d_debut, date_fin=d_fin
  )

  print("\n--- BILAN PAR TRANCHES DE 15 JOURS (AVEC RELIEF RÉEL) ---")
  print(df_bilan.to_string(index=False))

  afficher_rapport_diagnostic(diagnostic)

  dossier_logs = os.path.join("data", "logs")
  os.makedirs(dossier_logs, exist_ok=True)
  df_bilan.to_csv(
      os.path.join(dossier_logs, f"bilan_reel_lat{lat}_lon{lon}.csv"),
      index=False,
  )