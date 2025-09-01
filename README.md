# AI Coach - Multi-Exercise Form Tracker

A real-time exercise form validation application built with React and MediaPipe that provides instant feedback on workout technique. Perfect for home workouts, fitness coaching, and physical therapy applications.

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
- **Automatic Rep Counting**: 3 reps = 1 set with intelligent motion detection
- **Set Tracking**: Monitor total sets completed
- **Exercise Timer**: Track workout duration
- **Form Validation**: Real-time feedback with color-coded status

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
   git clone <your-repo-url>
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

| Status | Color | Meaning |
|--------|-------|---------|
| 🟢 Good | Green | Perfect form - keep going! |
| 🟡 Warning | Yellow | Minor adjustment needed |
| 🔴 Error | Red | Form correction required |

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

### Rep Detection
Each exercise has specific motion patterns for rep counting:
- **Bicep Curls**: Arm angle transitions (extended → contracted → extended)
- **Squats**: Hip angle changes (standing → squat → standing)
- **Front Kicks**: Leg angle variations (extended → retracted → extended)

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel/Netlify
1. Push your code to GitHub
2. Connect your repository to Vercel or Netlify
3. Deploy automatically on push

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

### Browser Compatibility
- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge

## 📱 Mobile Support

The application is fully responsive and works on:
- **iOS Safari**: 14+
- **Android Chrome**: 90+
- **Tablets**: iPad, Android tablets

## 🔒 Privacy & Security

- **Local Processing**: All pose detection runs in your browser
- **No Data Collection**: No personal data is stored or transmitted
- **Camera Access**: Only used for pose detection, not recorded

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **MediaPipe**: Google's pose detection technology
- **React Team**: For the amazing framework
- **Vite**: For the fast build tool

## 📞 Support

For questions or issues:
1. Check the troubleshooting section
2. Review the exercise guidelines
3. Test with different lighting conditions
4. Create an issue in the repository

---

**Happy Exercising! 💪**

*Built with ❤️ using React and MediaPipe*
