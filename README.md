# 🎓 Slow Learner Identification System

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.8+-3776ab?style=flat-square&logo=python)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-Latest-black?style=flat-square&logo=flask)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-Latest-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)

**AI-powered system to identify and support students at risk of academic struggle**

[Features](#features) • [Quick Start](#quick-start) • [Installation](#installation) • [Usage](#usage) • [Architecture](#architecture)

</div>

---

## 📋 Overview

The **Slow Learner Identification System** uses machine learning to predict which students may need additional academic support based on their performance metrics and behaviors. Our intelligent system analyzes student data and provides actionable insights for educators to intervene early and provide targeted support.

---

## ✨ Features

- 🤖 **Advanced ML Models** - Random Forest and XGBoost classifiers for accurate predictions
- 📊 **Interactive Dashboard** - Real-time visualization of student statistics and predictions
- 🎯 **Student Prediction** - Predict academic risk based on multiple features
- 📈 **Model Performance Metrics** - Track accuracy and identify high-risk students
- 🛠️ **RESTful API** - Flexible backend for integration with other systems
- 💻 **Modern UI** - Responsive React frontend with Vite bundler

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- pip (Python package manager)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd slow-learner-identification
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running the Application

#### Backend (Flask API)
```bash
cd backend
python app.py
```
The API will be available at `http://localhost:5000`

#### Frontend (React)
```bash
cd frontend
npm run dev
```
The dashboard will be available at `http://localhost:5173`

---

## 📁 Project Structure

```
slow-learner-identification/
├── backend/
│   ├── app.py                 # Flask API application
│   └── __pycache__/           # Python cache
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main React component
│   │   ├── main.jsx           # Entry point
│   │   └── App.css            # Styling
│   ├── index.html             # HTML template
│   ├── package.json           # npm dependencies
│   ├── vite.config.js         # Vite configuration
│   └── node_modules/          # npm packages
├── student-mat.csv            # Student dataset
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

---

## 🛠️ Tech Stack

### Backend
- **Flask** - Lightweight web framework
- **Scikit-learn** - Machine learning library
- **XGBoost** - Gradient boosting framework
- **Pandas** - Data manipulation and analysis
- **NumPy** - Numerical computing

### Frontend
- **React** - UI library
- **Vite** - Fast build tool and dev server
- **JavaScript/CSS** - Frontend technologies

### Data
- **Student Performance Dataset** - Portuguese school student metrics

---

## 📊 How It Works

### 1. **Data Processing**
   - Loads student performance data from CSV
   - Handles categorical and numeric features
   - Identifies "slow learners" (grade < 10)

### 2. **Model Training**
   - Splits data into training and testing sets
   - Trains both Random Forest and XGBoost models
   - Calculates accuracy metrics

### 3. **Prediction**
   - Accepts student features (age, study time, failures, grades, etc.)
   - Returns risk prediction and recommended interventions
   - Provides confidence scores

### 4. **Visualization**
   - Dashboard displays key statistics
   - Shows grade distribution and risk breakdown
   - Interactive prediction interface

---

## 🎯 Key Metrics

| Metric | Description |
|--------|-------------|
| **Total Students** | Number of students in the dataset |
| **Slow Learner %** | Percentage of at-risk students |
| **Model Accuracy** | Overall model prediction accuracy |
| **Best Model** | Top performing classification model |

---

## 📝 API Endpoints

### Statistics
```
GET /api/statistics
```
Returns overall statistics and model performance metrics.

### Predict
```
POST /api/predict
Content-Type: application/json

{
  "age": 16,
  "studytime": 2,
  "failures": 0,
  "absences": 5,
  "G1": 10,
  "G2": 12
}
```
Returns prediction and recommended interventions.

---

## 💡 Remedial Support

The system provides targeted recommendations for at-risk students:

- 📍 **Attendance Improvement** - Enhance class participation
- 📚 **Tutoring Programs** - One-on-one or group tutoring sessions
- ⏱️ **Study Time Optimization** - Develop effective study strategies

---

## 🔧 Configuration

Key model parameters can be found in `backend/app.py`:
- Random Forest parameters
- XGBoost hyperparameters
- Train-test split ratio
- Slow learner threshold (G3 < 10)

---

## 📦 Dependencies

### Python (`requirements.txt`)
```
flask
flask-cors
scikit-learn
xgboost
pandas
numpy
```

### Node.js (`frontend/package.json`)
- React and React DOM
- Vite development tools

---

## 🚀 Future Enhancements

- [ ] Add more advanced ML models (Neural Networks, Ensemble methods)
- [ ] Implement student profile tracking over time
- [ ] Add teacher authentication and student management
- [ ] Generate detailed intervention reports
- [ ] Integration with school management systems
- [ ] Mobile app for mobile access

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Support

For issues, questions, or feedback:
- Open an issue on GitHub
- Check existing documentation
- Review the code comments

---

<div align="center">

**Made with ❤️ for Educational Excellence**

⭐ If you find this project helpful, please consider giving it a star!

</div>
