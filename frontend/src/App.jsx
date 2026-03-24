import { useEffect, useMemo, useState } from 'react'

const ENV_API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const API_BASE = ENV_API_BASE.trim().replace(/\/$/, '')

console.info('[Config] VITE_API_BASE_URL:', ENV_API_BASE || '(not set)')
if (!ENV_API_BASE.trim()) {
  console.error('[Config] VITE_API_BASE_URL is missing. Set it in Render environment variables.')
}

const defaultStats = {
  total_students: 0,
  slow_learner_percentage: 0,
  model_accuracy: 0,
  best_model: 'N/A',
  grade_distribution: {
    '0-4': 0,
    '5-9': 0,
    '10-14': 0,
    '15-20': 0
  }
}

const initialForm = {
  age: 16,
  studytime: 2,
  failures: 0,
  absences: 0,
  G1: 10,
  G2: 10
}

const remedialIcons = {
  '📍': 'Attendance',
  '📚': 'Tutoring',
  '⏱️': 'Study',
  '🎯': 'Foundation',
  '⭐': 'Progress'
}

function App() {
  const [stats, setStats] = useState(defaultStats)
  const [form, setForm] = useState(initialForm)
  const [prediction, setPrediction] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingPredict, setLoadingPredict] = useState(false)
  const [error, setError] = useState('')
  const [bulkResults, setBulkResults] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('single')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (!API_BASE) {
      setError('VITE_API_BASE_URL is not set. Please configure it in Render.')
      setLoadingStats(false)
      return
    }

    fetch(`${API_BASE}/stats`)
      .then(async (res) => {
        console.info('[API] GET /stats status:', res.status)
        if (!res.ok) {
          throw new Error('Failed to load statistics from backend.')
        }
        return res.json()
      })
      .then((data) => {
        setStats({ ...defaultStats, ...data })
      })
      .catch((err) => {
        console.error('[API] GET /stats failed:', err)
        setError(err.message)
      })
      .finally(() => {
        setLoadingStats(false)
      })
  }, [])

  const maxBarValue = useMemo(() => {
    const counts = Object.values(stats.grade_distribution || {})
    return Math.max(...counts, 1)
  }, [stats.grade_distribution])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: Number(value) }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoadingPredict(true)
    setError('')

    try {
      if (!API_BASE) {
        throw new Error('VITE_API_BASE_URL is not set. Please configure it in Render.')
      }

      const response = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      console.info('[API] POST /predict status:', response.status)

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        console.error('[API] POST /predict error payload:', payload)
        throw new Error(payload.error || 'Prediction failed.')
      }

      const data = await response.json()
      console.info('[API] POST /predict success:', data)
      setPrediction(data)
    } catch (err) {
      console.error('[API] POST /predict failed:', err)
      setError(err.message)
    } finally {
      setLoadingPredict(false)
    }
  }

  const isSlowLearner = prediction?.prediction === 1
  const confidenceValue = Number(prediction?.confidence || 0)
  const confidenceStroke = Math.min(Math.max(confidenceValue, 0), 100)

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setBulkLoading(true)
    setError('')

    try {
      if (!API_BASE) {
        throw new Error('VITE_API_BASE_URL is not set. Please configure it in Render.')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE}/bulk_predict`, {
        method: 'POST',
        body: formData
      })
      console.info('[API] POST /bulk_predict status:', response.status)

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        console.error('[API] POST /bulk_predict error payload:', payload)
        throw new Error(payload.error || 'Bulk prediction failed.')
      }

      const data = await response.json()
      console.info('[API] POST /bulk_predict success:', data)
      setBulkResults(data.results || [])
      setActiveTab('bulk')
    } catch (err) {
      console.error('[API] POST /bulk_predict failed:', err)
      setError(err.message)
    } finally {
      setBulkLoading(false)
      event.target.value = ''
    }
  }

  const downloadCSVReport = () => {
    if (bulkResults.length === 0) {
      alert('No results to download.')
      return
    }

    let csv = 'Student Index,Prediction,Confidence (%),Label\n'
    bulkResults.forEach((result) => {
      csv += `${result.index},"${result.label}",${result.confidence},"${result.prediction === 1 ? 'Slow Learner' : 'Normal Student'}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bulk_predictions_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const slowLearnerRecs = prediction?.recommendations || []

  const generatePDFReport = () => {
    if (!prediction) {
      alert('No prediction data available.')
      return
    }

    const reportContent = `
EDUSCAN STUDENT ANALYSIS REPORT
Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

========================================
STUDENT PREDICTION SUMMARY
========================================
Status: ${prediction.label}
Confidence: ${prediction.confidence}%
Model Used: ${prediction.model_used}

========================================
STUDENT INPUT DATA
========================================
Age: ${form.age}
Study Time: ${form.studytime}
Previous Failures: ${form.failures}
Absences: ${form.absences}
First Grade (G1) - Out of 20: ${form.G1}
Second Grade (G2) - Out of 20: ${form.G2}

========================================
AI ASSESSMENT
========================================
Prediction: ${prediction.label}
Confidence Score: ${prediction.confidence}%
Slow Learner Probability: ${prediction.slow_learner_probability}%

${prediction.recommendations && prediction.recommendations.length > 0 ? `========================================
RECOMMENDED INTERVENTIONS
========================================
${prediction.recommendations.map((rec, idx) => `${idx + 1}. ${rec.title}\n   ${rec.desc}`).join('\n\n')}` : ''}

========================================
DATASET STATISTICS
========================================
Total Students Analyzed: ${stats.total_students}
Slow Learner Percentage: ${stats.slow_learner_percentage}%
Model Accuracy: ${stats.model_accuracy}%

========================================
NOTES FOR EDUCATORS
========================================
Use this assessment to provide timely academic support.
Regular monitoring and intervention can improve student outcomes.
Coordinate with parents for home-based support initiatives.

Report prepared by: EduScan AI System
Disclaimer: This assessment is based on ML predictions and should be
used in conjunction with teacher observations and domain expertise.
    `.trim()

    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `student_report_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const classAverage = useMemo(() => {
    if (stats.total_students === 0) return null
    return {
      slowPct: stats.slow_learner_percentage,
      normalPct: 100 - stats.slow_learner_percentage
    }
  }, [stats])

  const riskLevel = useMemo(() => {
    if (!prediction) return null
    
    // If predicted as Normal Student, risk is always Low
    if (!isSlowLearner) {
      return { level: 'Low', color: '#22c55e' }
    }
    
    // If predicted as Slow Learner, use confidence to determine severity
    const conf = Number(prediction.confidence || 0)
    if (conf > 80) return { level: 'Critical', color: '#dc2626' }
    if (conf > 60) return { level: 'High', color: '#f97316' }
    if (conf > 40) return { level: 'Moderate', color: '#eab308' }
    return { level: 'Low-Moderate', color: '#eab308' }
  }, [prediction, isSlowLearner])

  return (
    <div className={`page ${darkMode ? 'dark' : 'light'}`}>
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />

      <div className="top-strip card">
        <span>Academic Intelligence Dashboard</span>
        <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} title="Toggle theme">
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <header className="hero card">
        <p className="eyebrow">EduScan</p>
        <h1>AI Powered Slow Learner Detection System</h1>
        <p>
          Analyze student academic indicators and identify learners who need timely academic support.
        </p>
        <div className="hero-tags">
          <span>ML Driven</span>
          <span>Teacher Friendly</span>
          <span>Early Intervention</span>
        </div>
      </header>

      <section className="stats-grid">
        <article className="card metric">
          <div className="metric-head">
            <p>Total Students Analyzed</p>
            <span className="metric-icon">ST</span>
          </div>
          <h2>{loadingStats ? '...' : stats.total_students}</h2>
        </article>

        <article className="card metric">
          <div className="metric-head">
            <p>Slow Learner Percentage</p>
            <span className="metric-icon">SL</span>
          </div>
          <h2>{loadingStats ? '...' : `${stats.slow_learner_percentage}%`}</h2>
        </article>

        <article className="card metric">
          <div className="metric-head">
            <p>Model Accuracy</p>
            <span className="metric-icon">AI</span>
          </div>
          <h2>{loadingStats ? '...' : `${stats.model_accuracy}%`}</h2>
          <small>Best Model: {stats.best_model}</small>
        </article>
      </section>

      <section className="content-grid">
        <article className="card form-card">
          <h3>Student Prediction Form</h3>
          <p className="section-subtitle">Enter core academic details to run a quick learner risk assessment.</p>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Age
              <input type="number" name="age" min="10" max="25" value={form.age} onChange={handleChange} required />
            </label>
            <label>
              Study Time (1-4)
              <input
                type="number"
                name="studytime"
                min="1"
                max="4"
                value={form.studytime}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Failures
              <input
                type="number"
                name="failures"
                min="0"
                max="4"
                value={form.failures}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Absences
              <input
                type="number"
                name="absences"
                min="0"
                max="100"
                value={form.absences}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              First Grade (G1) - Out of 20
              <input type="number" name="G1" min="0" max="20" value={form.G1} onChange={handleChange} required />
            </label>
            <label>
              Second Grade (G2) - Out of 20
              <input type="number" name="G2" min="0" max="20" value={form.G2} onChange={handleChange} required />
            </label>
            <button type="submit" disabled={loadingPredict}>
              {loadingPredict ? 'Analyzing...' : 'Analyze Student'}
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </article>

        <article className="card result-card">
          <h3>Prediction Result</h3>
          <p className="section-subtitle">The badge and confidence score are generated from the best performing model.</p>
          {!prediction && <p>Submit student details to view AI assessment.</p>}
          {prediction && (
            <div className="result-body">
              <span className={`badge ${isSlowLearner ? 'danger' : 'success'}`}>
                {isSlowLearner ? 'Slow Learner' : 'Normal Student'}
              </span>
              <h4>{prediction.label}</h4>
              <p>
                Confidence: <strong>{prediction.confidence}%</strong>
              </p>
              <p>Slow Learner Probability: {prediction.slow_learner_probability}%</p>
              <div className="confidence-meter" aria-label="Prediction confidence meter">
                <div className="confidence-track">
                  <div className="confidence-fill" style={{ width: `${confidenceStroke}%` }} />
                </div>
                <span>{confidenceStroke.toFixed(2)}%</span>
              </div>

              {riskLevel && (
                <div className="risk-gauge">
                  <p className="gauge-label">Risk Level: <span style={{ color: riskLevel.color }}>{riskLevel.level}</span></p>
                  <div className="gauge-container">
                    <div className="gauge-bar">
                      <div
                        className="gauge-fill"
                        style={{
                          width: `${confidenceStroke}%`,
                          background: riskLevel.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {classAverage && (
                <div className="class-comparison">
                  <p className="comparison-label">Class Comparison</p>
                  <div className="comparison-row">
                    <span>Your Prediction:</span>
                    <strong>{isSlowLearner ? 'Slow Learner' : 'Normal Student'}</strong>
                  </div>
                  <div className="comparison-row">
                    <span>Class Average (Slow):</span>
                    <strong>{classAverage.slowPct.toFixed(1)}%</strong>
                  </div>
                </div>
              )}

              <button className="report-btn" onClick={generatePDFReport}>
                📄 Download Text Report
              </button>
            </div>
          )}
        </article>
      </section>

      {prediction && isSlowLearner && slowLearnerRecs.length > 0 && (
        <section className="card remedial-section">
          <h3>Remedial Recommendations</h3>
          <p className="section-subtitle">Actionable steps to support this student's academic growth.</p>
          <div className="recommendations-grid">
            {slowLearnerRecs.map((rec, idx) => (
              <div key={idx} className="rec-card">
                <span className="rec-icon">{rec.icon}</span>
                <h4>{rec.title}</h4>
                <p>{rec.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card chart-card">
        <div className="chart-header">
          <h3>Grade Distribution (G3)</h3>
          <span>Final Grade Range</span>
        </div>
        <div className="chart">
          {Object.entries(stats.grade_distribution || {}).map(([label, count]) => (
            <div key={label} className="bar-wrap">
              <div
                className="bar"
                style={{ height: `${Math.max((count / maxBarValue) * 100, 6)}%` }}
                title={`${label}: ${count}`}
              />
              <strong>{count}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card bulk-section">
        <h3>Bulk Class Analysis</h3>
        <p className="section-subtitle">Upload a CSV file to get predictions for all students in your class at once.</p>
        <div className="upload-area">
          <label htmlFor="bulk-file" className="upload-label">
            <span className="upload-icon">📤</span>
            <span className="upload-text">Choose CSV File</span>
            <span className="upload-hint">or drag and drop</span>
            <input
              id="bulk-file"
              type="file"
              accept=".csv"
              onChange={handleBulkUpload}
              disabled={bulkLoading}
              hidden
            />
          </label>
          {bulkLoading && <p className="loading-text">Processing bulk predictions...</p>}
        </div>

        {bulkResults.length > 0 && (
          <div className="bulk-results">
            <div className="results-header">
              <span>{bulkResults.length} student(s) analyzed</span>
              <button className="download-btn" onClick={downloadCSVReport}>
                📥 Download Report (CSV)
              </button>
            </div>
            <div className="table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Student #</th>
                    <th>Prediction</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.map((result, idx) => (
                    <tr key={idx} className={`row-${result.prediction === 1 ? 'slow' : 'normal'}`}>
                      <td>{result.index + 1}</td>
                      <td>
                        <span className={`badge ${result.prediction === 1 ? 'danger' : 'success'}`}>
                          {result.label}
                        </span>
                      </td>
                      <td>{result.confidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default App
