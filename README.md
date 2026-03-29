# EduScan — AI Powered Slow Learner Detection System

An intelligent system that uses Machine Learning to identify at-risk students early and provide targeted intervention recommendations. Built with React + Vite (frontend) and Flask + XGBoost (backend).

## 🚀 Live Demo
- **Frontend:** [https://eduscan.vercel.app](https://eduscan.vercel.app)
- **Backend API:** [https://eduscan-backend.onrender.com](https://eduscan-backend.onrender.com)

## 📊 Tech Stack
- **Frontend:** React 18.3.1 + Vite 5.4.8 + Lucide Icons + Inter Font
- **Backend:** Flask 3.0.0 + Flask-CORS + XGBoost 3.1.3 + scikit-learn 1.7.2
- **ML Model:** XGBoost Classification (92.41% accuracy)
- **Dataset:** UCI Student Performance Dataset (n=395 students)
- **Deployment:** Vercel (frontend) + Render (backend)

## ✨ Features

### Single Student Analysis
- Real-time prediction using trained XGBoost model
- 99%+ confidence scores backed by probability calibration
- AI-powered remedial recommendations based on student indicators
- Beautiful glassmorphism UI with dark theme

### Bulk Batch Prediction
- Upload CSV file with multiple students
- Batch process predictions with parallel inference
- Download results as CSV report

### Student Analytics Dashboard
- Overall statistics: total students, slow learner percentage, model accuracy
- Grade distribution visualization
- Real-time stats from training dataset

### PDF & CSV Reports
- Generate detailed text reports with prediction analysis
- Export bulk predictions as CSV for further analysis
- Student data, model confidence, and recommendations included

## 🏗️ Project Structure
```
eduscan/
├── backend/
│   ├── app.py                 # Flask API with model training & prediction
│   ├── requirements.txt       # Python dependencies
│   ├── Procfile              # Render deployment config
│   └── model.pkl             # Trained XGBoost model
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React component with all features
│   │   ├── App.css           # Dark theme + glassmorphism styles
│   │   └── main.jsx          # React entry point
│   ├── vite.config.js        # Vite build config
│   ├── package.json          # Node dependencies
│   ├── .env                  # Local development env vars
│   ├── .env.production       # Production env vars (Vercel)
│   └── index.html            # HTML template
├── student-mat.csv           # Training dataset
├── .gitignore               # Git config
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ with pip
- Node.js 16+ with npm

### Backend Setup (Local Development)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Or (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

The backend will start on `http://localhost:5000` and automatically train the model on first run.

### Frontend Setup (Local Development)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend will start on `http://localhost:5173`.

### Using the Application

1. **Single Prediction:**
   - Fill in student data (age, study time, failures, absences, grades)
   - Click "Predict"
   - See real-time prediction with confidence score and recommendations

2. **Bulk Analysis:**
   - Go to "Bulk Upload" tab
   - Upload a CSV file (format: age, studytime, failures, absences, G1, G2)
   - Download results as CSV

3. **View Stats:**
   - Dashboard shows overall statistics from training data
   - Model accuracy: 92.41%
   - See slow learner distribution

## 📋 API Endpoints

### GET `/stats`
Returns dataset statistics and model performance.
```json
{
  "total_students": 395,
  "slow_learner_percentage": 32.41,
  "model_accuracy": 92.41,
  "best_model": "XGBoost",
  "grade_distribution": {
    "0-4": 12,
    "5-9": 45,
    "10-14": 156,
    "15-20": 182
  }
}
```

### POST `/predict`
Predicts if a student is at-risk (slow learner).
```json
{
  "age": 16,
  "studytime": 1,
  "failures": 2,
  "absences": 20,
  "G1": 5,
  "G2": 4
}
```

Response:
```json
{
  "prediction": 1,
  "label": "Slow Learner",
  "confidence": 99.92,
  "slow_learner_probability": 99.92,
  "model_used": "XGBoost",
  "recommendations": [
    {
      "title": "Attendance Improvement Plan Needed",
      "desc": "Student is missing too many classes...",
      "icon": "⚠️"
    }
  ]
}
```

### POST `/bulk_predict`
Batch predicts multiple students from CSV upload.

## 🤖 Model Details

- **Algorithm:** XGBoost (selected from RandomForest/XGBoost by accuracy)
- **Training Set:** 395 students from UCI dataset
- **Target Variable:** G3 < 10 = Slow Learner (1), else Normal (0)
- **Features:** Age, study time, failures, absences, G1 (1st period), G2 (2nd period)
- **Preprocessing:** 
  - Categorical features: One-hot encoding
  - Numeric features: Passthrough (no scaling)
- **Accuracy:** 92.41%
- **Output:** Class prediction (0/1) + probability calibration

## 📦 Deployment

### Deploy Backend to Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repo
4. Set environment:
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn app:app`
5. Deploy! Backend will be available at `https://your-app.onrender.com`

### Deploy Frontend to Vercel

1. Push code to GitHub
2. Import project into Vercel
3. Set environment variable in Vercel dashboard:
   - `VITE_API_URL=https://your-backend.onrender.com`
4. Deploy! Frontend will be available at your Vercel URL

## 🔧 Environment Variables

### Frontend (.env.production)
```
VITE_API_URL=https://eduscan-backend.onrender.com
```

### Backend
- No environment variables needed for Render
- Model is packaged with the app (model.pkl)

## 🧪 Testing

### Local End-to-End Test
1. Ensure both servers are running
2. Open `http://localhost:5173` in browser
3. Open DevTools Console (F12)
4. Fill in a student with low grades (G1: 5, G2: 4)
5. Click Predict
6. Check console logs for `[FRONTEND]` and Flask terminal for `[BACKEND]` outputs
7. Should predict "Slow Learner" with high confidence

## 📝 Model Training

The model automatically trains on startup using `student-mat.csv`:

1. Loads dataset (395 students, 33 features)
2. Creates target: `slow_learner = G3 < 10`  
3. Trains RandomForest and XGBoost
4. Selects best by accuracy
5. Saves to `model.pkl` with feature names, defaults, and stats

To retrain: Delete `model.pkl` and restart the backend.

## 🎨 Design System

- **Color Palette:**
  - Dark navy: #0F172A (background)
  - Indigo: #6366F1 (primary)
  - Violet: #8B5CF6 (accent)
  - Orange: #F97316 (warning/risk)
  - Green: #22C55E (success)

- **Components:**
  - Glassmorphism cards with backdrop blur
  - Gradient hero section with animated badges
  - Sparkline mini-charts in stat cards
  - SVG confidence ring visualization
  - Responsive mobile-first layout

## 🤝 Contributing

Found a bug or have a feature request? Open an issue or submit a PR!

## 📄 License

MIT License - feel free to use for educational purposes.

## ⚠️ Disclaimer

This system provides ML-based predictions to assist educators. Predictions should be used in conjunction with:
- Teacher observations and domain expertise
- Student engagement and participation
- Parent communication and home support
- Individualized education plans

The model is trained on historical data and may have limitations in predicting individual student outcomes.

---

**Built with ❤️ for educators and students**

Questions? Check the logs:
- Browser Console (`F12`) → `[FRONTEND]` logs
- Flask Terminal → `[BACKEND]` logs
