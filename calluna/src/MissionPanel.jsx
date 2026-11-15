import React, { useState, useEffect } from 'react'

// Valeurs par défaut des seuils mission
const DEFAULT_THRESHOLDS = {
  pente_max_toleree_deg: 15.0,
  requis_soleil_pct: 65.0,
  autonomie_night_max_days: 4.0,
  requis_com_pct: 25.0,
  requis_sim_pct: 15.0,
}

// Profils de mission prédéfinis
const MISSION_PROFILES = {
  artemis: {
    label: 'Artemis / Heavy Lander',
    values: {
      pente_max_toleree_deg: 15.0,
      requis_soleil_pct: 65.0,
      autonomie_night_max_days: 4.0,
      requis_com_pct: 25.0,
      requis_sim_pct: 15.0,
    },
  },
  rover: {
    label: 'Light rover',
    values: {
      pente_max_toleree_deg: 20.0,
      requis_soleil_pct: 50.0,
      autonomie_night_max_days: 2.0,
      requis_com_pct: 20.0,
      requis_sim_pct: 10.0,
    },
  },
  rtg: {
    label: 'Long-term Night Survival',
    values: {
      pente_max_toleree_deg: 12.0,
      requis_soleil_pct: 35.0,
      autonomie_night_max_days: 16.0,
      requis_com_pct: 25.0,
      requis_sim_pct: 10.0,
    },
  },
}

// Dictionnaire pédagogique des métriques (libellés, unités, explications pour le bouton (i))
const METRIC_INFO = {
  altitude_site_m: {
    label: 'LOLA Altitude',
    unit: 'm',
    desc: "Elevation of the terrain at the landing site, according to LOLA topography. Negative values indicate a location below the lunar mean radius.",
  },
  pente_locale_deg: {
    label: 'Local slope estimated',
    unit: '°',
    desc: "Average inclination of the terrain around the landing site. Beyond the maximum threshold, the lander risks tipping over.",
  },
  horizon_max_deg: {
    label: 'Maximum horizon obstacle',
    unit: '°',
    desc: 'Maximum angular height of surrounding terrain features (crater rims, mountains) that block the view of the low sky.',
  },
  loss_sunlight_relief_j: {
    label: 'Sunshade (relief)',
    unit: 'days',
    desc: 'Number of days of cumulative sunlight lost due to shadows cast by neighboring craters and mountains.',
  },
  loss_earthcomm_relief_j: {
    label: 'Earth shade(relief)',
    unit: 'days',
    desc: 'Number of days of cumulative radio visibility lost due to surrounding terrain features blocking the direct line of sight to Earth.',
  },
  freq_soleil_moy: {
    label: 'Real Sun visibility',
    unit: '%',
    desc: 'Percentage of the total mission time when the Sun is visible above the local terrain for solar panel charging.',
  },
  night_max_days: {
    label: 'Night duration (max)',
    unit: 'days',
    desc: "Longest continuous night period (Sun below -5°) during the mission window. The lander must survive this duration without solar power.",
  },
  freq_com_moy: {
    label: 'Real Earth visibility',
    unit: '%',
    desc: 'Percentage of the total mission time when Earth is visible above the local horizon, allowing direct radio communication without relay satellites.',
  },
  freq_sim_moy: {
    label: 'Simultaneity Sun + Earth',
    unit: '%',
    desc: 'Percentage of the total mission time when the site receives both solar energy and direct communication with Earth (active operations).',
  },
  elev_soleil_max: {
    label: 'Max Sun elevation (peak)',
    unit: '°',
    desc: 'Maximum angular height of the Sun in the local sky during the entire mission window.',
  },
  elev_terre_max: {
    label: 'Max Earth elevation (peak)',
    unit: '°',
    desc: 'Maximum angular height of Earth in the local sky during the entire mission window.',
  },
  delai_radio_moy: {
    label: 'Average radio latency',
    unit: 's',
    desc: 'Average one-way travel time of a radio signal at the speed of light between the Moon and Earth.',
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
              {status ? 'YES' : 'NO'}
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
                ? '✓ Criteria met: the measured value is within the configured threshold.'
                : '✕ Criteria not met: the measured value exceeds the configured threshold.'}
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

  const survieNightOk =
    donnees.nuit_max_days !== undefined
      ? donnees.nuit_max_days <= thresholds.autonomie_night_max_days
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
  if (atterrissageOk === false) failedReasons.push('slope too steep')
  if (energieOk === false) failedReasons.push('insufficient sunlight')
  if (survieNightOk === false) failedReasons.push('too long continuous night')
  if (comOk === false) failedReasons.push('insufficient Earth communication')
  if (simultaneOk === false) failedReasons.push('insufficient simultaneity')
  const isViable = diagnostic ? failedReasons.length === 0 : false
  const dynamicVerdict = isViable
    ? 'SITE VIABLE (Every mission criterion is met)'
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
            SITE ANALYSIS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parametres')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'parametres' ? styles.tabBtnActive : {}),
            }}
          >
            MISSION SETTINGS
          </button>
        </div>

        {/* ===================== ONGLET 1 : ANALYSE ===================== */}
        {activeTab === 'analyse' && (
          <>
            <div style={styles.subHint}>Double-click on the Moon or choose a site :</div>

            <div style={styles.presets}>
              <button style={styles.presetBtn} onClick={() => onSelectSite(26.1322, 3.6339)}>
                Apollo 15
              </button>
              <button style={styles.presetBtn} onClick={() => onSelectSite(-89.8, 129.0)}>
                Shackleton
              </button>
              <button style={styles.presetBtn} onClick={() => onSelectSite(0, 0)}>
                Equator (0,0)
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

            <div style={{ marginTop: '10px' }}>
                <div
                    style={{
                    fontSize: '10px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    marginBottom: '6px',
                    fontWeight: 600,
                    }}
                >
                    Mission Dates
                </div>

                <div style={styles.row}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Launch</span>
                    <FrenchDateInput
                        value={debut}
                        onChange={setDebut}
                        style={styles.dateInput}
                    />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Return</span>
                    <FrenchDateInput
                        value={fin}
                        onChange={setFin}
                        style={styles.dateInput}
                    />
                    </div>
                </div>
            </div>

            <button
              onClick={() => onSelectSite(parseFloat(lat) ||0, parseFloat(lon) ||0)}
              disabled={loading}
              style={styles.runBtn}
            >
              {loading ? 'COMPUTING LOLA + HORIZONS...' : 'ANALYZE SITE'}
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
                  Click on <span style={styles.inlineInfoDemo}>i</span> to understand each parameter.
                </div>

                {/* 1. TOPOGRAPHIE & SÉCURITÉ D'ATTERRISSAGE */}
                <div style={styles.sectionBox}>
                  <div style={styles.sectionTitle}>1. TOPOGRAPHIE & SÉCURITÉ D&apos;ATTERRISSAGE</div>

                  <MetricItem
                    metricKey="pente_locale_deg"
                    value={donnees.pente_locale_deg}
                    thresholdText={`Mission threshold : ≤ ${thresholds.pente_max_toleree_deg}°`}
                    status={atterrissageOk}
                  />

                  <MetricItem
                    metricKey="altitude_site_m"
                    value={donnees.altitude_site_m}
                  />

                  <MetricItem
                    metricKey="horizon_max_deg"
                    value={donnees.horizon_max_deg}
                    subValue="(craters/reliefs)"
                  />

                  <MetricItem
                    metricKey="loss_sunlight_relief_j"
                    value={
                      donnees.perte_soleil_relief_j !== undefined
                        ? `-${donnees.perte_soleil_relief_j}`
                        : undefined
                    }
                    subValue={
                      donnees.perte_terre_relief_j !== undefined
                        ? `| -${donnees.perte_terre_relief_j} d Earth`
                        : ''
                    }
                  />
                </div>

                {/* 2. ÉNERGIE & SURVIE THERMIQUE */}
                <div style={styles.sectionBox}>
                  <div style={styles.sectionTitle}>2. ENERGY & THERMAL SURVIVAL</div>

                  <MetricItem
                    metricKey="freq_soleil_moy"
                    value={donnees.freq_soleil_moy}
                    subValue={
                      donnees.jours_soleil_total !== undefined &&
                      donnees.jours_mission_total !== undefined
                        ? `(${donnees.jours_soleil_total}d / ${donnees.jours_mission_total}d)`
                        : ''
                    }
                    thresholdText={`Mission threshold : ≥ ${thresholds.requis_soleil_pct}%`}
                    status={energieOk}
                  />

                  <MetricItem
                    metricKey="night_max_days"
                    value={donnees.nuit_max_jours}
                    thresholdText={`Battery autonomy : ≤ ${thresholds.autonomie_night_max_days} days`}
                    status={survieNightOk}
                  />
                </div>

                {/* 3. LIAISON RADIO DIRECTE TERRE & SIMULTANÉITÉ */}
                <div style={styles.sectionBox}>
                  <div style={styles.sectionTitle}>3. DIRECT EARTH RADIO COMMUNICATION & SIMULTANEITY</div>

                  <MetricItem
                    metricKey="freq_com_moy"
                    value={donnees.freq_com_moy}
                    subValue={
                      donnees.jours_com_total !== undefined
                        ? `(${donnees.jours_com_total}d cumulated)`
                        : ''
                    }
                    thresholdText={`Mission threshold : ≥ ${thresholds.requis_com_pct}%`}
                    status={comOk}
                  />

                  <MetricItem
                    metricKey="freq_sim_moy"
                    value={donnees.freq_sim_moy}
                    subValue={
                      donnees.jours_sim_total !== undefined
                        ? `(${donnees.jours_sim_total}d cumulated)`
                        : ''
                    }
                    thresholdText={`Mission threshold : ≥ ${thresholds.requis_sim_pct}%`}
                    status={simultaneOk}
                  />

                  <MetricItem
                    metricKey="delai_radio_moy"
                    value={donnees.delai_radio_moy}
                    subValue="(single trip)"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllDetails(!showAllDetails)}
                  style={styles.moreBtn}
                >
                  {showAllDetails
                    ? '▲ Hide additional astronomical parameters'
                    : '▼ Show additional astronomical parameters'}
                </button>

                {showAllDetails && (
                  <div style={styles.sectionBox}>
                    <div style={styles.sectionTitle}>COMPLEMENTARY ASTRONOMICAL PARAMETERS</div>
                    <MetricItem metricKey="elev_soleil_max" value={donnees.elev_soleil_max} />
                    <MetricItem metricKey="elev_terre_max" value={donnees.elev_terre_max} />
                    <MetricItem
                      metricKey="loss_earthcomm_relief_j"
                      value={donnees.loss_earthcomm_relief_j}
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
              Adjust the mission thresholds to evaluate the viability of a landing site. The results will update in real-time in the "Site Analysis" tab.
            </div>

            {/* Profils prédéfinis */}
            <div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '6px' }}>
                PREDEFINED MISSION PROFILES:
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
              label="Maximum tolerable slope"
              unit="°"
              min={1}
              max={45}
              step={0.5}
              value={thresholds.pente_max_toleree_deg}
              onChange={(val) => updateThreshold('pente_max_toleree_deg', val)}
              hint="Maximum slope the lander can tolerate."
            />

            <ThresholdControl
              label="Minimum sunlight exposure"
              unit="%"
              min={0}
              max={100}
              step={1}
              value={thresholds.requis_soleil_pct}
              onChange={(val) => updateThreshold('requis_soleil_pct', val)}
              hint="Minimum sunlight exposure required for the mission."
            />

            <ThresholdControl
              label="Continuous night autonomy"
              unit="days"
              min={0.5}
              max={20}
              step={0.5}
              value={thresholds.autonomie_night_max_days}
              onChange={(val) => updateThreshold('autonomie_night_max_days', val)}
              hint="Maximum duration of survival without sunlight (batteries + thermal heating)."
            />

            <ThresholdControl
              label="Minimum Earth visibility"
              unit="%"
              min={0}
              max={100}
              step={1}
              value={thresholds.requis_com_pct}
              onChange={(val) => updateThreshold('requis_com_pct', val)}
              hint="Minimum time of direct radio link available with Earth."
            />

            <ThresholdControl
              label="Minimum simultaneous Sun + Earth"
              unit="%"
              min={0}
              max={100}
              step={1}
              value={thresholds.requis_sim_pct}
              onChange={(val) => updateThreshold('requis_sim_pct', val)}
              hint="Minimum time with solar energy AND direct communication available simultaneously."
            />

            <button
              type="button"
              onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
              style={styles.resetBtn}
            >
              ↺ Reset to default thresholds
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analyse')}
              style={styles.runBtn}
            >
              VIEW THE RESULTS ON THE SITE →
            </button>
          </div>
        )}
      </div>

      {/* Languette latérale */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.toggleTab}
        title={isOpen ? 'Reduce the panel' : 'Open the mission panel'}
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