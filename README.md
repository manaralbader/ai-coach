# AI Coach - Multi-Exercise Form Tracker Testing

A real-time exercise form validation application built with React and MediaPipe that provides instant feedback on workout technique. For testing.

![AI Coach Demo](https://img.shields.io/badge/React-19.1.1-blue) ![MediaPipe](https://img.shields.io/badge/MediaPipe-Pose-orange) ![Vite](https://img.shields.io/badge/Vite-7.1.2-purple)

## 🎯 Features

### ✅ Real-Time Pose Detection
- **MediaPipe Integration**: Advanced pose detection with 33 body landmarks
- **Continuous Skeletal Visualization**: Real-time drawing of connected body joints
- **Smooth Performance**: Optimized for 60fps tracking

### 🏋️ Multi-Exercise Support
- **Bicep Curls**: Arm angle validation and curl form tracking
- **Front Kicks**: Leg extension and torso position monitoring
- **Squats**: Comprehensive form analysis including depth, knee bend, and posture

### 📊 Smart Exercise Tracking
- **Enhanced Rep Counting**: Motion phase detection with smoothed angle calculations
- **Intelligent Set Tracking**: 3 reps = 1 set with automatic progression
- **Exercise Timer**: Track workout duration with precision
- **Multi-Joint Form Validation**: Comprehensive angle analysis for perfect form
- **Pose Confidence Filtering**: Only processes high-confidence pose detections
- **Real-Time Phase Display**: Shows current exercise phase (extended, contracted, etc.)
- **Optical Flow Detection**: Movement velocity tracking prevents false rep counts
- **Graduated Visual Feedback**: Green/Yellow/Orange/Red color system based on form accuracy
- **Session Analytics**: Track total reps, correct reps, accuracy percentage, and form scores
- **Performance Monitoring**: Real-time processing time and confidence metrics

### 🎨 User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Pastel Green Theme**: Modern, clean interface
- **Exercise Selection**: Easy switching between different workouts
- **Visual Feedback**: Clear instructions and real-time guidance

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Modern web browser with camera access
- Webcam for pose detection

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/manaralbader/ai-coach
   cd ai-coach
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5177` (or the port shown in your terminal)

5. **Allow camera permissions**
   Click "Allow" when prompted for camera access

## 🎮 How to Use

### Getting Started
1. **Select an Exercise**: Choose from Bicep Curls, Front Kicks, or Squats using the dropdown
2. **Review Instructions**: Read the exercise-specific guidelines displayed
3. **Start Tracking**: Click "Start [Exercise]" to begin form validation
4. **Follow Feedback**: Watch for real-time guidance and form corrections

### Exercise Guidelines

#### 🏋️ Bicep Curls
- **Target**: Keep upper arm close to torso (angle < 35°)
- **Form**: Curl arm to bring hand close to shoulder (angle < 70°)
- **Rep Detection**: Extended → Contracted → Extended motion

#### 🦵 Front Kicks
- **Target**: Extend leg fully during kick (angle > 120°)
- **Form**: Keep torso upright (hip angle 71-120°)
- **Rep Detection**: Extended → Retracted → Extended motion

#### 🦵 Squats
- **Target**: Proper squat depth (hip angle 50-71°)
- **Form**: Bend knees adequately (knee angle 55-68°)
- **Posture**: Keep chest up (torso angle 35-43°)
- **Balance**: Weight on heels (ankle angle 75-85°)
- **Rep Detection**: Standing → Squat → Standing motion

### Understanding Feedback

| Status | Color | Deviation | Meaning |
|--------|-------|-----------|---------|
| 🟢 Perfect | Green | 0% | All angles within perfect range |
| 🟡 Good | Yellow | 5-10% | Minor deviation from ideal |
| 🟠 Warning | Orange | 10-20% | Moderate deviation - needs attention |
| 🔴 Error | Red | >20% | Major form correction required |

### Advanced Features

#### 🎯 **Graduated Visual Feedback**
- **Scientific Accuracy**: Deviation percentage calculation from ideal ranges
- **Specific Angle Readings**: "Torso angle is 48° - reduce forward lean to 35-43°"
- **Priority-Based Messages**: Shows most critical form error first
- **Real-Time Form Scoring**: 0-100% form accuracy display

#### 📊 **Session Analytics**
- **Total Reps**: Complete count of all attempted reps
- **Correct Reps**: Reps with form score ≥70%
- **Accuracy Percentage**: Real-time accuracy calculation
- **Average Confidence**: Pose detection confidence over time
- **Form Error Tracking**: Log of common mistakes and timestamps

#### ⚡ **Performance Monitoring**
- **Processing Time**: Real-time MediaPipe processing speed (<50ms target)
- **Pose Confidence**: Live confidence percentage display
- **Movement Detection**: Optical flow prevents false rep counting
- **Frame Rate Optimization**: Smooth 60fps tracking performance

### Real-Time Display Elements
- **Phase Indicator**: Shows current exercise phase (extended, contracted, standing, squat, etc.)
- **Form Score**: Real-time 0-100% form accuracy display
- **Confidence Meter**: Displays pose detection confidence percentage
- **Processing Time**: Shows MediaPipe processing speed in milliseconds
- **Rep Counter**: Current rep within set (e.g., "2/3")
- **Set Tracker**: Current set and total sets completed
- **Timer**: Elapsed exercise time
- **Session Analytics**: Total reps, correct reps, accuracy percentage

## 🏗️ Project Structure

```
ai-coach/
├── src/
│   ├── components/
│   │   └── PoseDetector.jsx      # Main exercise tracking component
│   ├── exerciseRules.js          # Exercise validation logic
│   ├── App.jsx                   # Main application component
│   ├── App.css                   # Styling and responsive design
│   └── main.jsx                  # Application entry point
├── public/                       # Static assets
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## 🔧 Technical Details

### Core Technologies
- **React 19.1.1**: Modern React with hooks and functional components
- **MediaPipe**: Google's pose detection library
- **Vite**: Fast build tool and development server
- **Canvas API**: Real-time pose visualization

### Key Components

#### `PoseDetector.jsx`
- Handles camera initialization and pose detection
- Manages exercise state and rep counting
- Provides real-time feedback and UI updates

#### `exerciseRules.js`
- Contains validation logic for all exercises
- Defines angle thresholds and feedback messages
- Modular design for easy exercise addition

### Performance Optimizations
- **Smooth Landmarks**: Enabled for stable tracking
- **Model Complexity**: Balanced for speed and accuracy
- **Canvas Optimization**: Efficient drawing with proper cleanup
- **Responsive Design**: Optimized for all screen sizes

## 🎯 Exercise Validation Logic

### Angle Calculations
The application calculates joint angles using three-point geometry:
```javascript
const calculateAngle = (point1, point2, point3) => {
  const radians = Math.atan2(point3.y - point2.y, point3.x - point2.x) -
                 Math.atan2(point1.y - point2.y, point1.x - point2.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
};
```

### Enhanced Rep Detection
Each exercise uses sophisticated motion phase detection for accurate rep counting:

#### 🏋️ Bicep Curls
- **Phase Detection**: Extended (160°) → Contracted (70°) → Extended (160°)
- **Angle Smoothing**: Reduces MediaPipe jitter for stable counting
- **Threshold Logic**: Precise angle boundaries for reliable rep detection

#### 🦵 Squats  
- **Phase Detection**: Standing (160°) → Squat (70°) → Standing (160°)
- **Multi-Joint Validation**: Hip, knee, torso, and ankle angle analysis
- **Form Scoring**: Overall form correctness based on all joint angles

#### 🦵 Front Kicks
- **Phase Detection**: Extended (120°) → Retracted (110°) → Extended (120°)
- **Confidence Filtering**: Only counts reps with high pose confidence (>80%)
- **Balance Monitoring**: Torso position validation during kicks

### Technical Improvements
- **Angle Smoothing**: 70% previous + 30% current angle for stability
- **Pose Confidence**: Filters out uncertain detections (<80% confidence)
- **Phase State Management**: Tracks current exercise phase in real-time
- **Multi-Joint Analysis**: Validates multiple body angles simultaneously
- **Optical Flow Detection**: Movement velocity tracking prevents false rep counts
- **Temporal Smoothing**: Moving average calculations for stable measurements
- **Deviation Calculation**: Scientific percentage-based form assessment
- **Performance Optimization**: <50ms processing time per frame target
- **Session Data Collection**: Comprehensive analytics and form tracking

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 🤝 Contributing

### Adding New Exercises
1. **Update `exerciseRules.js`**:
   - Add new exercise configuration
   - Define validation logic
   - Set rep detection parameters

2. **Update `PoseDetector.jsx`**:
   - Add exercise to dropdown
   - Implement rep counting logic

3. **Test thoroughly** with different users and lighting conditions

### Code Style
- Use functional components with hooks
- Follow React best practices
- Maintain consistent pastel green theme
- Ensure responsive design

## 🐛 Troubleshooting

### Common Issues

**Camera not working:**
- Check browser permissions
- Ensure HTTPS in production
- Try refreshing the page

**Pose detection unstable:**
- Improve lighting conditions
- Ensure full body is visible
- Check camera quality

**Performance issues:**
- Close other browser tabs
- Reduce browser extensions
- Check system resources

