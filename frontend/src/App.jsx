import { useEffect, useMemo, useState, useRef } from 'react'
import { Users, AlertTriangle, Target, Wand2, Cloud } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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
    fetch(`${API_BASE}/stats`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to load statistics from backend.')
        }
        return res.json()
      })
      .then((data) => {
        setStats({ ...defaultStats, ...data })
      })
      .catch((err) => {
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
      console.log('[FRONTEND] ========== PREDICTION REQUEST ==========')
      console.log('[FRONTEND] Form data:', form)
      const payload = form
      console.log('[FRONTEND] Payload being sent to /predict:', payload)
      
      const response = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Prediction failed.')
      }

      const data = await response.json()
      console.log('[FRONTEND] Raw Flask response received:', data)
      console.log('[FRONTEND] Prediction value:', data.prediction)
      console.log('[FRONTEND] Label:', data.label)
      console.log('[FRONTEND] Confidence:', data.confidence)
      console.log('[FRONTEND] ========== END PREDICTION ==========')
      
      // NO OVERRIDE - Using response directly
      setPrediction(data)
    } catch (err) {
      console.error('[FRONTEND] Error:', err.message)
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
    <div className="page">
      {/* Gradient top border */}
      <div className="gradient-top-border" />
      
      {/* Animated mesh background */}
      <div className="mesh-background" />

      {/* Hero Section */}
      <header className="hero card">
        <div className="hero-content">
          <div className="logo-section">
            <div className="logo-gradient">EduScan</div>
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" fill="currentColor" />
            </svg>
          </div>
          
          <div className="hero-center">
            <h1>AI-Powered Slow Learner Detection</h1>
            <p className="hero-subtitle">Identify at-risk students early with XGBoost (92.41% accuracy)</p>
            
            <div className="hero-badges">
              <span className="badge-pill">🤖 ML-Driven</span>
              <span className="badge-pill">📚 Teacher Friendly</span>
              <span className="badge-pill">⚡ Early Intervention</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="stats-grid">
        <article className="card stat-card stat-card-1">
          <div className="stat-icon-wrapper">
            <Users size={28} />
          </div>
          <h2>{loadingStats ? '...' : stats.total_students}</h2>
          <p>Total Students</p>
          <div className="sparkline">
            <div style={{ height: '40%' }} />
            <div style={{ height: '60%' }} />
            <div style={{ height: '45%' }} />
            <div style={{ height: '70%' }} />
            <div style={{ height: '50%' }} />
          </div>
        </article>

        <article className="card stat-card stat-card-2">
          <div className="stat-icon-wrapper">
            <AlertTriangle size={28} />
          </div>
          <h2>{loadingStats ? '...' : `${stats.slow_learner_percentage}%`}</h2>
          <p>Slow Learner %</p>
          <div className="sparkline">
            <div style={{ height: '45%' }} />
            <div style={{ height: '55%' }} />
            <div style={{ height: '50%' }} />
            <div style={{ height: '65%' }} />
            <div style={{ height: '58%' }} />
          </div>
        </article>

        <article className="card stat-card stat-card-3">
          <div className="stat-icon-wrapper">
            <Target size={28} />
          </div>
          <h2>{loadingStats ? '...' : `${stats.model_accuracy}%`}</h2>
          <p>Model Accuracy</p>
          <div className="sparkline">
            <div style={{ height: '70%' }} />
            <div style={{ height: '75%' }} />
            <div style={{ height: '80%' }} />
            <div style={{ height: '85%' }} />
            <div style={{ height: '90%' }} />
          </div>
        </article>
      </section>

      {/* Two-Column Layout */}
      <section className="content-grid">
        {/* Left: Form */}
        <article className="card form-card">
          <div className="section-header">
            <h3>🎓 Analyze Student</h3>
            <p className="section-subtitle">Review student performance metrics</p>
          </div>
          
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input 
                id="age"
                type="number" 
                name="age" 
                min="10" 
                max="25" 
                value={form.age} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="studytime">Study Time (1-4)</label>
              <input 
                id="studytime"
                type="number" 
                name="studytime" 
                min="1" 
                max="4" 
                value={form.studytime} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="failures">Failures</label>
              <input 
                id="failures"
                type="number" 
                name="failures" 
                min="0" 
                max="4" 
                value={form.failures} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="absences">Absences</label>
              <input 
                id="absences"
                type="number" 
                name="absences" 
                min="0" 
                max="100" 
                value={form.absences} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="G1">Grade 1 (0-20)</label>
              <input 
                id="G1"
                type="number" 
                name="G1" 
                min="0" 
                max="20" 
                value={form.G1} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="G2">Grade 2 (0-20)</label>
              <input 
                id="G2"
                type="number" 
                name="G2" 
                min="0" 
                max="20" 
                value={form.G2} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <button type="submit" className="btn-analyze" disabled={loadingPredict}>
              <Wand2 size={18} />
              {loadingPredict ? 'Analyzing...' : 'Analyze Student'}
            </button>
          </form>
          
          {error && <div className="error-message">{error}</div>}
        </article>

        {/* Right: Prediction Result */}
        <article className="card result-card">
          <div className="section-header">
            <h3>AI Assessment</h3>
            <p className="section-subtitle">Powered by XGBoost model</p>
          </div>
          
          {!prediction ? (
            <div className="result-placeholder">
              <svg className="placeholder-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p>Submit student data to see AI prediction</p>
            </div>
          ) : (
            <div className="result-content">
              <div className={`result-badge ${isSlowLearner ? 'badge-danger' : 'badge-success'}`}>
                {isSlowLearner ? '⚠️ SLOW LEARNER DETECTED' : '✅ ON TRACK'}
              </div>
              
              <div className="confidence-ring">
                <svg viewBox="0 0 120 120" className="ring-svg">
                  <defs>
                    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="54" className="ring-background" />
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="54" 
                    className="ring-progress"
                    style={{ strokeDasharray: `${(confidenceStroke / 100) * 339.3}, 339.3` }}
                  />
                </svg>
                <div className="ring-text">
                  <span className="ring-value">{confidenceStroke.toFixed(0)}%</span>
                  <span className="ring-label">Confidence</span>
                </div>
              </div>
              
              <div className="result-details">
                <p className="detail-label">Prediction:</p>
                <p className="detail-value">{prediction.label}</p>
                
                <p className="detail-label" style={{ marginTop: '12px' }}>Slow Learner Probability:</p>
                <p className="detail-value">{prediction.slow_learner_probability}%</p>
              </div>
              
              <button className="btn-download" onClick={generatePDFReport}>
                📄 Download Report
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

      {/* Grade Distribution Chart */}
      <section className="card chart-card">
        <div className="chart-header">
          <div>
            <h3>📊 Grade Distribution (G3)</h3>
            <p className="section-subtitle">Final Grade Range Analysis</p>
          </div>
          <span className="chart-tag">Final Grade Range</span>
        </div>
        
        <div className="chart-container">
          <svg className="chart-gradient-defs" width="0" height="0">
            <defs>
              <linearGradient id="gradientBar" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          
          {Object.entries(stats.grade_distribution || {}).map(([label, count]) => (
            <div key={label} className="bar-wrap" title={`${label}: ${count} students`}>
              <div
                className="bar"
                style={{ height: `${Math.max((count / maxBarValue) * 100, 6)}%` }}
              />
              <strong>{count}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Bulk Class Analysis */}
      <section className="card bulk-section">
        <div className="section-header">
          <h3>📤 Bulk Class Analysis</h3>
          <p className="section-subtitle">Upload a CSV to analyze your entire class at once</p>
        </div>
        
        <div className="upload-zone">
          <label htmlFor="bulk-file" className="upload-label">
            <Cloud size={48} className="upload-icon" />
            <span className="upload-title">Drop your class CSV here</span>
            <span className="upload-hint">or click to browse — supports .csv files</span>
            <input
              id="bulk-file"
              type="file"
              accept=".csv"
              onChange={handleBulkUpload}
              disabled={bulkLoading}
              hidden
            />
          </label>
          {bulkLoading && <p className="loading-text">⏳ Processing bulk predictions...</p>}
        </div>

        {bulkResults.length > 0 && (
          <div className="bulk-results">
            <div className="results-header">
              <span>{bulkResults.length} student(s) analyzed</span>
              <button className="btn-download-csv" onClick={downloadCSVReport}>
                📥 Download Report (CSV)
              </button>
            </div>
            <div className="table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Prediction</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.map((result, idx) => (
                    <tr key={idx} className={`row-${result.prediction === 1 ? 'slow' : 'normal'}`}>
                      <td>{result.index + 1}</td>
                      <td>
                        <span className={`badge ${result.prediction === 1 ? 'badge-danger' : 'badge-success'}`}>
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
