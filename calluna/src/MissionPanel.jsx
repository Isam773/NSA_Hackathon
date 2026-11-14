import React, { useState, useEffect } from 'react'

// Valeurs par défaut des seuils mission
const DEFAULT_THRESHOLDS = {
  pente_max_toleree_deg: 15.0,
  requis_soleil_pct: 65.0,
  autonomie_nuit_max_jours: 4.0,
  requis_com_pct: 25.0,
  requis_sim_pct: 15.0,
}

// Profils de mission prédéfinis
const MISSION_PROFILES = {
  artemis: {
    label: 'Base Artémis',
    values: {
      pente_max_toleree_deg: 15.0,
      requis_soleil_pct: 65.0,
      autonomie_nuit_max_jours: 4.0,
      requis_com_pct: 25.0,
      requis_sim_pct: 15.0,
    },
  },
  rover: {
    label: 'Rover Léger',
    values: {
      pente_max_toleree_deg: 20.0,
      requis_soleil_pct: 50.0,
      autonomie_nuit_max_jours: 2.0,
      requis_com_pct: 20.0,
      requis_sim_pct: 10.0,
    },
  },
  rtg: {
    label: 'Survie Longue Nuit',
    values: {
      pente_max_toleree_deg: 12.0,
      requis_soleil_pct: 35.0,
      autonomie_nuit_max_jours: 16.0,
      requis_com_pct: 25.0,
      requis_sim_pct: 10.0,
    },
  },
}

// Dictionnaire pédagogique des métriques (libellés, unités, explications pour le bouton (i))
const METRIC_INFO = {
  altitude_site_m: {
    label: 'Altitude réelle LOLA',
    unit: 'm',
    desc: "Élévation du terrain par rapport au rayon moyen lunaire (1 737,4 km), mesurée par l'altimètre laser LOLA (Lunar Orbiter Laser Altimeter).",
  },
  pente_locale_deg: {
    label: 'Pente locale estimée',
    unit: '°',
    desc: "Inclinaison moyenne du sol autour du point d'atterrissage. Au-delà du seuil maximal, l'atterrisseur risque de basculer au posé.",
  },
  horizon_max_deg: {
    label: 'Obstacle horizon max',
    unit: '°',
    desc: 'Hauteur angulaire maximale des reliefs environnants (remparts de cratères, montagnes) qui masquent le ciel bas.',
  },
  perte_soleil_relief_j: {
    label: 'Masquage Soleil (relief)',
    unit: 'jours',
    desc: 'Nombre de jours cumulés d’ensoleillement perdus à cause de l’ombre portée par les cratères et montagnes voisins.',
  },
  perte_terre_relief_j: {
    label: 'Masquage Terre cumulé (relief)',
    unit: 'jours',
    desc: 'Nombre de jours cumulés de visibilité radio perdus à cause des reliefs bloquant la ligne de visée directe vers la Terre.',
  },
  freq_soleil_moy: {
    label: 'Ensoleillement réel',
    unit: '%',
    desc: 'Pourcentage du temps total de la mission où le Soleil est visible au-dessus du relief local pour alimenter les panneaux solaires.',
  },
  nuit_max_jours: {
    label: 'Nuit / ombre continue max',
    unit: 'jours',
    desc: "Plus longue période consécutive sans Soleil. Si elle dépasse l'autonomie batterie/thermique, les instruments risquent le gel (-180 °C).",
  },
  freq_com_moy: {
    label: 'Visibilité Terre réelle',
    unit: '%',
    desc: 'Pourcentage du temps où la Terre est visible au-dessus de l’horizon local, permettant une liaison radio directe sans satellite relais.',
  },
  freq_sim_moy: {
    label: 'Simultanéité Soleil + Terre',
    unit: '%',
    desc: 'Pourcentage du temps où le site reçoit à la fois de l’énergie solaire ET dispose d’une liaison directe avec la Terre (opérations actives).',
  },
  elev_soleil_max: {
    label: 'Élévation max du Soleil (pic)',
    unit: '°',
    desc: 'Hauteur angulaire maximale atteinte par le Soleil dans le ciel local durant toute la fenêtre de mission.',
  },
  elev_terre_max: {
    label: 'Élévation max de la Terre (pic)',
    unit: '°',
    desc: 'Hauteur angulaire maximale atteinte par la Terre dans le ciel local durant toute la fenêtre de mission.',
  },
  delai_radio_moy: {
    label: 'Latence radio moyenne',
    unit: 's',
    desc: 'Temps moyen de trajet aller simple d’un signal radio à la vitesse de la lumière entre la Lune et la Terre.',
  },
}

function MetricItem({ metricKey, value, subValue, thresholdText, status }) {
  const [showInfo, setShowInfo] = useState(false)
  const info = METRIC_INFO[metricKey] || { label: metricKey, unit: '', desc: '' }

  if (value === undefined || value === null) return null

  return (
    <div style={styles.metricContainer}>
      <div style={styles.metricTopRow}>
        <div style={styles.metricLeft}>
          <span style={styles.metricLabel}>{info.label}</span>
          {info.desc && (
            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              style={{
                ...styles.infoBtn,
                backgroundColor: showInfo ? '#38bdf8' : 'rgba(56, 189, 248, 0.15)',
                color: showInfo ? '#080b12' : '#38bdf8',
              }}
              title="Plus d'informations sur ce paramètre"
            >
              i
            </button>
          )}
        </div>

        <div style={styles.metricRight}>
          <span style={styles.metricValue}>
            {value}
            {info.unit && <span style={styles.metricUnit}> {info.unit}</span>}
          </span>
          {subValue && <span style={styles.metricSub}>{subValue}</span>}
          {status !== undefined && status !== null && (
            <span
              style={{
                ...styles.statusPill,
                backgroundColor: status ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: status ? '#4ade80' : '#f87171',
                borderColor: status ? '#22c55e' : '#ef4444',
              }}
            >
              {status ? 'OUI' : 'NON'}
            </span>
          )}
        </div>
      </div>

      {thresholdText && <div style={styles.thresholdLine}>{thresholdText}</div>}

      {showInfo && info.desc && (
        <div style={styles.infoBox}>
          {info.desc}
          {status !== undefined && status !== null && (
            <div style={{ marginTop: '4px', color: status ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
              {status
                ? '✓ Critère respecté : la valeur mesurée respecte le seuil configuré.'
                : '✕ Critère hors limite : la valeur mesurée dépasse le seuil configuré.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ThresholdControl({ label, unit, min, max, step, value, onChange, hint }) {
  return (
    <div style={styles.thresholdCard}>
      <div style={styles.thresholdHeader}>
        <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{label}</span>
        <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>
          {value} {unit}
        </span>
      </div>
      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '6px' }}>{hint}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, cursor: 'pointer', accentColor: '#38bdf8' }}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={styles.smallNumberInput}
        />
      </div>
    </div>
  )
}

// Champ de date affiché au format français (JJ/MM/AAAA) et stocké en ISO (YYYY-MM-DD)
function FrenchDateInput({ value, onChange, style }) {
  const toFrench = (iso) => {
    if (!iso || !iso.includes('-')) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const [text, setText] = useState(toFrench(value))

  useEffect(() => {
    setText(toFrench(value))
  }, [value])

  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^\d/]/g, '')
    // Ajout automatique des slashs pendant la saisie (JJ/MM/AAAA)
    if (raw.length === 2 && text.length === 1) raw += '/'
    if (raw.length === 5 && text.length === 4) raw += '/'
    if (raw.length > 10) return

    setText(raw)

    // Dès que la date JJ/MM/AAAA est complète, on convertit en YYYY-MM-DD pour l'API
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (match) {
      const [, d, m, y] = match
      const day = Number(d)
      const month = Number(m)
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        onChange(`${y}-${m}-${d}`)
      }
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="JJ/MM/AAAA"
      value={text}
      onChange={handleChange}
      style={style}
    />
  )
}

export default function MissionPanel({
  lat,
  setLat,
  lon,
  setLon,
  debut,
  setDebut,
  fin,
  setFin,
  loading,
  onSelectSite,
  diagnostic,
}) {
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('analyse') // 'analyse' | 'parametres'
  const [showAllDetails, setShowAllDetails] = useState(false)
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS)

  useEffect(() => {
    if (diagnostic || loading) {
      setIsOpen(true)
    }
  }, [diagnostic, loading])

  const updateThreshold = (key, val) => {
    setThresholds((prev) => ({ ...prev, [key]: val }))
  }

  // Données brutes renvoyées par le backend
  const criteresBackend = diagnostic?.criteres_valides || diagnostic?.criteres || {}
  const donnees = diagnostic?.donnees_factuelles || diagnostic || {}

  // Évaluation dynamique en temps réel selon les seuils choisis par l'utilisateur
  const atterrissageOk =
    donnees.pente_locale_deg !== undefined
      ? donnees.pente_locale_deg <= thresholds.pente_max_toleree_deg
      : criteresBackend.atterrissage_ok

  const energieOk =
    donnees.freq_soleil_moy !== undefined
      ? donnees.freq_soleil_moy >= thresholds.requis_soleil_pct
      : criteresBackend.energie_ok

  const survieNuitOk =
    donnees.nuit_max_jours !== undefined
      ? donnees.nuit_max_jours <= thresholds.autonomie_nuit_max_jours
      : criteresBackend.survie_nuit_ok

  const comOk =
    donnees.freq_com_moy !== undefined
      ? donnees.freq_com_moy >= thresholds.requis_com_pct
      : criteresBackend.com_ok

  const simultaneOk =
    donnees.freq_sim_moy !== undefined
      ? donnees.freq_sim_moy >= thresholds.requis_sim_pct
      : criteresBackend.simultane_ok

  // Calcul du verdict global dynamique
  const failedReasons = []
  if (atterrissageOk === false) failedReasons.push('pente trop forte')
  if (energieOk === false) failedReasons.push('ensoleillement insuffisant')
  if (survieNuitOk === false) failedReasons.push('nuit continue trop longue')
  if (comOk === false) failedReasons.push('liaison Terre insuffisante')
  if (simultaneOk === false) failedReasons.push('simultanéité insuffisante')

  const isViable = diagnostic ? failedReasons.length === 0 : false
  const dynamicVerdict = isViable
    ? 'SITE VIABLE (Tous les critères mission sont respectés)'
    : `NON VIABLE (${failedReasons.join(', ')})`

  return (
    <div
      style={{
        ...styles.drawerWrapper,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      }}
    >
      <div style={styles.panel}>
        {/* En-tête */}
        <div style={styles.headerRow}>
          <span style={styles.title}>MISSION PLANNER</span>
          <button
            onClick={() => setIsOpen(false)}
            style={styles.closeBtn}
            title="Fermer le panneau"
          >
            ✕
          </button>
        </div>

        {/* Barre d'onglets : Analyse / Seuils Mission */}
        <div style={styles.tabBar}>
          <button
            type="button"
            onClick={() => setActiveTab('analyse')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'analyse' ? styles.tabBtnActive : {}),
            }}
          >
            📊 ANALYSE SITE
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parametres')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'parametres' ? styles.tabBtnActive : {}),
            }}
          >
            ⚙️ SEUILS MISSION
          </button>
        </div>

        {/* ===================== ONGLET 1 : ANALYSE ===================== */}
        {activeTab === 'analyse' && (
          <>
            <div style={styles.subHint}>Double-cliquez sur la Lune ou choisissez un site :</div>

            <div style={styles.presets}>
              <button style={styles.presetBtn} onClick={() => onSelectSite(26.1322, 3.6339)}>
                Apollo 15
              </button>
              <button style={styles.presetBtn} onClick={() => onSelectSite(-89.8, 129.0)}>
                Shackleton
              </button>
              <button style={styles.presetBtn} onClick={() => onSelectSite(0, 0)}>
                Équateur (0,0)
              </button>
            </div>

            <div style={styles.row}>
              <label style={styles.label}>Lat :</label>
              <input
                type="text"
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                style={styles.input}
              />
              <label style={styles.label}>Lon :</label>
              <input
                type="text"
                inputMode="decimal"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.row}>
              <FrenchDateInput
                value={debut}
                onChange={setDebut}
                style={styles.dateInput}
             />
            <FrenchDateInput
                value={fin}
                onChange={setFin}
                style={styles.dateInput}
            />
            </div>

            <button
              onClick={() => onSelectSite(parseFloat(lat) ||0, parseFloat(lon) ||0)}
              disabled={loading}
              style={styles.runBtn}
            >
              {loading ? 'CALCUL LOLA + HORIZONS...' : 'ANALYSER CE SITE'}
            </button>

            {diagnostic && (
              <div style={styles.diagBox}>
                {/* Verdict global recalculé en direct */}
                <div
                  style={{
                    ...styles.verdictBadge,
                    backgroundColor: isViable ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                    borderColor: isViable ? '#22c55e' : '#ef4444',
                    color: isViable ? '#4ade80' : '#f87171',
                  }}
                >
                  {isViable ? '✅ ' : '⚠️ '}
                  {dynamicVerdict}
                </div>

                <div style={styles.helperHint}>
                  Cliquez sur <span style={styles.inlineInfoDemo}>i</span> pour comprendre chaque paramètre.
                </div>

                {/* 1. TOPOGRAPHIE & SÉCURITÉ D'ATTERRISSAGE */}
                <div style={styles.sectionBox}>
                  <div style={styles.sectionTitle}>1. TOPOGRAPHIE & SÉCURITÉ D&apos;ATTERRISSAGE</div>

                  <MetricItem
                    metricKey="pente_locale_deg"
                    value={donnees.pente_locale_deg}
                    thresholdText={`Seuil mission : ≤ ${thresholds.pente_max_toleree_deg}°`}
                    status={atterrissageOk}
                  />

                  <MetricItem
                    metricKey="altitude_site_m"
                    value={donnees.altitude_site_m}
                  />

                  <MetricItem
                    metricKey="horizon_max_deg"
                    value={donnees.horizon_max_deg}
                    subValue="(cratères / reliefs)"
                  />

                  <MetricItem
                    metricKey="perte_soleil_relief_j"
                    value={
                      donnees.perte_soleil_relief_j !== undefined
                        ? `-${donnees.perte_soleil_relief_j}`
                        : undefined
                    }
                    subValue={
                      donnees.perte_terre_relief_j !== undefined
                        ? `| -${donnees.perte_terre_relief_j} j Terre`
                        : ''
                    }
                  />
                </div>

                {/* 2. ÉNERGIE & SURVIE THERMIQUE */}
                <div style={styles.sectionBox}>
                  <div style={styles.sectionTitle}>2. ÉNERGIE & SURVIE THERMIQUE</div>

                  <MetricItem
                    metricKey="freq_soleil_moy"
                    value={donnees.freq_soleil_moy}
                    subValue={
                      donnees.jours_soleil_total !== undefined &&
                      donnees.jours_mission_total !== undefined
                        ? `(${donnees.jours_soleil_total}j / ${donnees.jours_mission_total}j)`
                        : ''
                    }
                    thresholdText={`Seuil mission : ≥ ${thresholds.requis_soleil_pct}%`}
                    status={energieOk}
                  />

                  <MetricItem
                    metricKey="nuit_max_jours"
                    value={donnees.nuit_max_jours}
                    thresholdText={`Autonomie batterie : ≤ ${thresholds.autonomie_nuit_max_jours} jours`}
                    status={survieNuitOk}
                  />
                </div>

                {/* 3. LIAISON RADIO DIRECTE TERRE & SIMULTANÉITÉ */}
                <div style={styles.sectionBox}>
                  <div style={styles.sectionTitle}>3. LIAISON TERRE & SIMULTANÉITÉ</div>

                  <MetricItem
                    metricKey="freq_com_moy"
                    value={donnees.freq_com_moy}
                    subValue={
                      donnees.jours_com_total !== undefined
                        ? `(${donnees.jours_com_total}j cumulés)`
                        : ''
                    }
                    thresholdText={`Seuil mission : ≥ ${thresholds.requis_com_pct}%`}
                    status={comOk}
                  />

                  <MetricItem
                    metricKey="freq_sim_moy"
                    value={donnees.freq_sim_moy}
                    subValue={
                      donnees.jours_sim_total !== undefined
                        ? `(${donnees.jours_sim_total}j cumulés)`
                        : ''
                    }
                    thresholdText={`Seuil mission : ≥ ${thresholds.requis_sim_pct}%`}
                    status={simultaneOk}
                  />

                  <MetricItem
                    metricKey="delai_radio_moy"
                    value={donnees.delai_radio_moy}
                    subValue="(aller simple)"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllDetails(!showAllDetails)}
                  style={styles.moreBtn}
                >
                  {showAllDetails
                    ? '▲ Masquer les paramètres astronomiques complémentaires'
                    : '▼ Afficher les élévations max & détails complémentaires'}
                </button>

                {showAllDetails && (
                  <div style={styles.sectionBox}>
                    <div style={styles.sectionTitle}>PARAMÈTRES COMPLÉMENTAIRES</div>
                    <MetricItem metricKey="elev_soleil_max" value={donnees.elev_soleil_max} />
                    <MetricItem metricKey="elev_terre_max" value={donnees.elev_terre_max} />
                    <MetricItem
                      metricKey="perte_terre_relief_j"
                      value={donnees.perte_terre_relief_j}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ===================== ONGLET 2 : PARAMÈTRES SEUILS ===================== */}
        {activeTab === 'parametres' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '24px' }}>
            <div style={styles.subHint}>
              Ajustez les contraintes techniques de votre atterrisseur. Le diagnostic du site se met à jour en direct.
            </div>

            {/* Profils prédéfinis */}
            <div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '6px' }}>
                PROFILS DE MISSION PRÉDÉFINIS :
              </div>
              <div style={styles.presets}>
                {Object.entries(MISSION_PROFILES).map(([key, prof]) => (
                  <button
                    key={key}
                    type="button"
                    style={styles.presetBtn}
                    onClick={() => setThresholds(prof.values)}
                  >
                    {prof.label}
                  </button>
                ))}
              </div>
            </div>

            <ThresholdControl
              label="Pente maximale tolérée"
              unit="°"
              min={1}
              max={45}
              step={0.5}
              value={thresholds.pente_max_toleree_deg}
              onChange={(val) => updateThreshold('pente_max_toleree_deg', val)}
              hint="Inclinaison maximale du terrain supportée par les pieds de l'atterrisseur."
            />

            <ThresholdControl
              label="Ensoleillement minimal requis"
              unit="%"
              min={0}
              max={100}
              step={1}
              value={thresholds.requis_soleil_pct}
              onChange={(val) => updateThreshold('requis_soleil_pct', val)}
              hint="Part minimale de la mission exposée au Soleil pour recharger les systèmes."
            />

            <ThresholdControl
              label="Autonomie nuit continue"
              unit="jours"
              min={0.5}
              max={20}
              step={0.5}
              value={thresholds.autonomie_nuit_max_jours}
              onChange={(val) => updateThreshold('autonomie_nuit_max_jours', val)}
              hint="Durée maximale de survie sans Soleil (batteries + chauffage thermique)."
            />

            <ThresholdControl
              label="Visibilité Terre minimale"
              unit="%"
              min={0}
              max={100}
              step={1}
              value={thresholds.requis_com_pct}
              onChange={(val) => updateThreshold('requis_com_pct', val)}
              hint="Temps minimal de liaison radio directe disponible avec la Terre."
            />

            <ThresholdControl
              label="Simultanéité Soleil + Terre"
              unit="%"
              min={0}
              max={100}
              step={1}
              value={thresholds.requis_sim_pct}
              onChange={(val) => updateThreshold('requis_sim_pct', val)}
              hint="Temps minimal avec énergie solaire ET communication directe simultanées."
            />

            <button
              type="button"
              onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
              style={styles.resetBtn}
            >
              ↺ Réinitialiser les valeurs par défaut
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analyse')}
              style={styles.runBtn}
            >
              VOIR LE RÉSULTAT SUR LE SITE →
            </button>
          </div>
        )}
      </div>

      {/* Languette latérale */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.toggleTab}
        title={isOpen ? 'Réduire le panneau' : 'Ouvrir le panneau mission'}
      >
        {isOpen ? '◀' : '▶ MISSION'}
      </button>
    </div>
  )
}

const styles = {
  drawerWrapper: {
    position: 'fixed',
    top: '75px',
    left: 0,
    bottom: 0,
    width: '430px',
    maxWidth: '92vw',
    zIndex: 20,
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'stretch',
  },
  panel: {
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    backgroundColor: 'rgba(13, 17, 27, 0.95)',
    backdropFilter: 'blur(12px)',
    borderRight: '1px solid #252a35',
    padding: '18px',
    color: '#f8fafc',
    fontFamily: 'monospace',
    fontSize: '12px',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.6)',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #252a35',
    paddingBottom: '10px',
    marginBottom: '12px',
  },
  title: {
    fontSize: '12px',
    color: '#38bdf8',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  closeBtn: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: '2px 7px',
    fontSize: '12px',
  },
  tabBar: {
    display: 'flex',
    gap: '6px',
    marginBottom: '14px',
    backgroundColor: '#080b12',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid #252a35',
  },
  tabBtn: {
    flex: 1,
    padding: '7px 8px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '11px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
  },
  subHint: {
    fontSize: '11px',
    color: '#8c96a8',
    marginBottom: '10px',
    lineHeight: '1.4',
  },
  presets: {
    display: 'flex',
    gap: '6px',
    marginBottom: '12px',
  },
  presetBtn: {
    flex: 1,
    padding: '6px',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  label: {
    color: '#94a3b8',
    fontSize: '11px',
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '6px',
    backgroundColor: '#080b12',
    color: '#fff',
    border: '1px solid #334155',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },
  dateInput: {
    flex: 1,
    minWidth: 0,
    padding: '6px',
    backgroundColor: '#080b12',
    color: '#fff',
    border: '1px solid #334155',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  runBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '0.5px',
  },
  resetBtn: {
    width: '100%',
    padding: '8px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '11px',
  },
  diagBox: {
    marginTop: '14px',
    paddingTop: '12px',
    borderTop: '1px solid #252a35',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingBottom: '24px',
  },
  verdictBadge: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid',
    fontWeight: 'bold',
    fontSize: '11.5px',
    lineHeight: '1.4',
  },
  helperHint: {
    fontSize: '10.5px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  inlineInfoDemo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    color: '#38bdf8',
    fontWeight: 'bold',
    fontSize: '10px',
  },
  sectionBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    border: '1px solid #252a35',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    color: '#38bdf8',
    fontWeight: 'bold',
    fontSize: '11px',
    borderBottom: '1px solid #252a35',
    paddingBottom: '5px',
    letterSpacing: '0.5px',
  },
  metricContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    paddingBottom: '6px',
    borderBottom: '1px dashed rgba(51, 65, 85, 0.5)',
  },
  metricTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  metricLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  metricLabel: {
    color: '#cbd5e1',
    fontSize: '11.5px',
  },
  infoBtn: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '1px solid #38bdf8',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    flexShrink: 0,
  },
  metricRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  metricValue: {
    fontWeight: 'bold',
    color: '#f8fafc',
    fontSize: '12px',
  },
  metricUnit: {
    color: '#38bdf8',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  metricSub: {
    color: '#94a3b8',
    fontSize: '10.5px',
  },
  statusPill: {
    padding: '1px 6px',
    borderRadius: '4px',
    border: '1px solid',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  thresholdLine: {
    fontSize: '10.5px',
    color: '#94a3b8',
    paddingLeft: '2px',
  },
  infoBox: {
    marginTop: '4px',
    padding: '8px',
    backgroundColor: 'rgba(8, 11, 18, 0.85)',
    borderLeft: '2px solid #38bdf8',
    borderRadius: '4px',
    color: '#e2e8f0',
    fontSize: '11px',
    lineHeight: '1.45',
  },
  thresholdCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    border: '1px solid #252a35',
    borderRadius: '8px',
    padding: '10px',
  },
  thresholdHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
    fontSize: '11.5px',
  },
  smallNumberInput: {
    width: '62px',
    padding: '4px 6px',
    backgroundColor: '#080b12',
    color: '#fff',
    border: '1px solid #334155',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '11px',
    textAlign: 'right',
  },
  moreBtn: {
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid #334155',
    color: '#94a3b8',
    borderRadius: '6px',
    padding: '7px',
    cursor: 'pointer',
    fontSize: '10.5px',
    fontFamily: 'monospace',
  },
  toggleTab: {
    position: 'absolute',
    right: '-34px',
    top: '20px',
    writingMode: 'vertical-rl',
    textOrientation: 'mixed',
    backgroundColor: '#0d111b',
    color: '#38bdf8',
    border: '1px solid #252a35',
    borderLeft: 'none',
    borderRadius: '0 8px 8px 0',
    padding: '12px 8px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: '11px',
    letterSpacing: '1px',
    boxShadow: '4px 2px 12px rgba(0, 0, 0, 0.5)',
  },
}