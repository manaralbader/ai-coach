import React, { useRef, useEffect, useState } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { EXERCISE_RULES } from '../exerciseRules';

const PoseDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isExerciseStarted, setIsExerciseStarted] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('bicepCurls');
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [formStatus, setFormStatus] = useState('neutral');
  
  // Rep and Set counting
  const [currentRep, setCurrentRep] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [totalSets, setTotalSets] = useState(0);
  const [isInRepPosition, setIsInRepPosition] = useState(false);
  
  // Timer functionality
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);

  useEffect(() => {
    let pose;
    let camera;

    const initializePoseDetection = async () => {
      try {
        // Initialize MediaPipe Pose
        pose = new Pose({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          }
        });

        // Configure pose detection
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        // Set up pose detection callback
        pose.onResults((results) => {
          const canvasCtx = canvasRef.current.getContext('2d');
          const video = videoRef.current;
          
          // Set canvas dimensions to match video
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
          
          // Clear canvas
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Draw video frame
          canvasCtx.save();
          canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
          canvasCtx.restore();

          // Draw pose landmarks if detected
          if (results.poseLandmarks) {
            // Draw continuous skeletal structure with proper connections
            drawConnectors(canvasCtx, results.poseLandmarks, pose.POSE_CONNECTIONS,
              { color: '#90EE90', lineWidth: 3 }); // Light green for skeleton lines
            
            // Draw landmark points
            drawLandmarks(canvasCtx, results.poseLandmarks,
              { color: '#98FB98', lineWidth: 2, radius: 4 }); // Pale green for landmarks

            // Validate form and count reps if exercise is started
            if (isExerciseStarted) {
              const currentExercise = EXERCISE_RULES[selectedExercise];
              const formValidation = currentExercise.validation(results.poseLandmarks);
              setFeedback(formValidation.feedback);
              setFormStatus(formValidation.status);
              
              // Rep counting logic
              handleRepCounting(results.poseLandmarks, formValidation);
            }
          }
        });

        // Initialize camera
        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await pose.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });

        await camera.start();
        setIsDetecting(true);
        setError(null);

      } catch (err) {
        console.error('Error initializing pose detection:', err);
        setError('Failed to initialize pose detection. Please check your camera permissions.');
      }
    };

    initializePoseDetection();

    // Cleanup function
    return () => {
      if (camera) {
        camera.stop();
      }
      if (pose) {
        pose.close();
      }
    };
  }, [isExerciseStarted, selectedExercise]);

  // Rep counting logic
  const handleRepCounting = (landmarks, formValidation) => {
    const currentExercise = EXERCISE_RULES[selectedExercise];
    
    switch (selectedExercise) {
      case 'bicepCurls':
        // Count rep when arm goes from extended to contracted and back
        const upperArmForearmAngle = calculateAngle(
          landmarks[11], // LEFT_SHOULDER
          landmarks[13], // LEFT_ELBOW
          landmarks[15]  // LEFT_WRIST
        );
        
        if (upperArmForearmAngle < 60 && !isInRepPosition) {
          setIsInRepPosition(true);
        } else if (upperArmForearmAngle > 120 && isInRepPosition) {
          // Rep completed
          setIsInRepPosition(false);
          setCurrentRep(prev => {
            const newRep = prev + 1;
            if (newRep >= 3) {
              // Set completed
              setCurrentSet(prevSet => prevSet + 1);
              setTotalSets(prevTotal => prevTotal + 1);
              return 0; // Reset rep counter
            }
            return newRep;
          });
        }
        break;
        
      case 'squats':
        // Count rep when going from standing to squat and back
        const hipAngle = calculateAngle(
          landmarks[11], // LEFT_SHOULDER
          landmarks[23], // LEFT_HIP
          landmarks[25]  // LEFT_KNEE
        );
        
        if (hipAngle < 80 && !isInRepPosition) {
          setIsInRepPosition(true);
        } else if (hipAngle > 150 && isInRepPosition) {
          // Rep completed
          setIsInRepPosition(false);
          setCurrentRep(prev => {
            const newRep = prev + 1;
            if (newRep >= 3) {
              // Set completed
              setCurrentSet(prevSet => prevSet + 1);
              setTotalSets(prevTotal => prevTotal + 1);
              return 0; // Reset rep counter
            }
            return newRep;
          });
        }
        break;
        
      case 'frontKicks':
        // Count rep for each complete kick motion
        const legAngle = calculateAngle(
          landmarks[23], // LEFT_HIP
          landmarks[25], // LEFT_KNEE
          landmarks[27]  // LEFT_ANKLE
        );
        
        if (legAngle > 120 && !isInRepPosition) {
          setIsInRepPosition(true);
        } else if (legAngle < 90 && isInRepPosition) {
          // Rep completed
          setIsInRepPosition(false);
          setCurrentRep(prev => {
            const newRep = prev + 1;
            if (newRep >= 3) {
              // Set completed
              setCurrentSet(prevSet => prevSet + 1);
              setTotalSets(prevTotal => prevTotal + 1);
              return 0; // Reset rep counter
            }
            return newRep;
          });
        }
        break;
    }
  };

  // Timer functionality
  const startTimer = () => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval);
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const resetTimer = () => {
    stopTimer();
    setElapsedTime(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startExercise = () => {
    setIsExerciseStarted(true);
    setFeedback('Exercise started! Begin your ' + EXERCISE_RULES[selectedExercise].name.toLowerCase() + '.');
    setFormStatus('neutral');
    startTimer();
  };

  const stopExercise = () => {
    setIsExerciseStarted(false);
    setFeedback('');
    setFormStatus('neutral');
    stopTimer();
  };

  const handleExerciseChange = (exercise) => {
    setSelectedExercise(exercise);
    setIsExerciseStarted(false);
    setFeedback('');
    setFormStatus('neutral');
    resetTimer();
    setCurrentRep(0);
    setCurrentSet(1);
    setIsInRepPosition(false);
  };

  const resetCounters = () => {
    setCurrentRep(0);
    setCurrentSet(1);
    setTotalSets(0);
    setIsInRepPosition(false);
    resetTimer();
  };

  const getStatusColor = () => {
    switch (formStatus) {
      case 'good': return '#90EE90';
      case 'warning': return '#FFD700';
      case 'error': return '#FF6B6B';
      default: return '#98FB98';
    }
  };

  const currentExercise = EXERCISE_RULES[selectedExercise];

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#F0FFF0',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ 
        color: '#2E8B57',
        marginBottom: '20px',
        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
        fontWeight: '600',
        textAlign: 'center'
      }}>
        Exercise Form Tracker
      </h2>
      
      {error && (
        <div style={{ 
          color: '#FF6B6B', 
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#FFE6E6',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '800px'
        }}>
          {error}
        </div>
      )}

      {/* Top Control Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: '800px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Timer */}
        <div style={{
          backgroundColor: '#E8F5E8',
          padding: '10px 15px',
          borderRadius: '10px',
          border: '2px solid #90EE90',
          minWidth: '120px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#2E8B57', fontWeight: '600', fontSize: '0.9rem' }}>Timer</div>
          <div style={{ color: '#2E8B57', fontSize: '1.2rem', fontWeight: '700' }}>
            {formatTime(elapsedTime)}
          </div>
        </div>

        {/* Exercise Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <label style={{ 
            color: '#2E8B57',
            fontWeight: '600',
            fontSize: '0.9rem',
            marginBottom: '5px'
          }}>
            Exercise:
          </label>
          <select
            value={selectedExercise}
            onChange={(e) => handleExerciseChange(e.target.value)}
            style={{
              backgroundColor: '#90EE90',
              color: '#2E8B57',
              border: '2px solid #98FB98',
              borderRadius: '15px',
              padding: '8px 15px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              minWidth: '150px',
              textAlign: 'center'
            }}
          >
            <option value="bicepCurls">Bicep Curls</option>
            <option value="frontKicks">Front Kicks</option>
            <option value="squats">Squats</option>
          </select>
        </div>

        {/* Rep Counter */}
        <div style={{
          backgroundColor: '#E8F5E8',
          padding: '10px 15px',
          borderRadius: '10px',
          border: '2px solid #90EE90',
          minWidth: '120px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#2E8B57', fontWeight: '600', fontSize: '0.9rem' }}>Rep</div>
          <div style={{ color: '#2E8B57', fontSize: '1.2rem', fontWeight: '700' }}>
            {currentRep}/3
          </div>
        </div>
      </div>

      {/* Exercise Description */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#E8F5E8',
        borderRadius: '10px',
        border: '2px solid #90EE90',
        width: '100%',
        maxWidth: '800px'
      }}>
        <h3 style={{ color: '#2E8B57', marginBottom: '10px' }}>
          {currentExercise.name}
        </h3>
        <p style={{ color: '#2E8B57', marginBottom: '15px' }}>
          {currentExercise.description}
        </p>
      </div>
      
      {/* Centered Video Container */}
      <div style={{ 
        position: 'relative', 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: '800px',
        marginBottom: '20px'
      }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            maxWidth: '640px',
            height: 'auto',
            border: '3px solid #90EE90',
            borderRadius: '12px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
          }}
          autoPlay
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '640px',
            height: 'auto',
            pointerEvents: 'none',
            borderRadius: '12px'
          }}
        />
      </div>

      {/* Set Counter */}
      <div style={{
        backgroundColor: '#E8F5E8',
        padding: '10px 20px',
        borderRadius: '10px',
        border: '2px solid #90EE90',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{ color: '#2E8B57', fontWeight: '600', fontSize: '1rem' }}>
          Set: {currentSet} | Total Sets: {totalSets}
        </div>
      </div>
      
      {/* Exercise Controls */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {!isExerciseStarted ? (
          <button
            onClick={startExercise}
            style={{
              backgroundColor: '#90EE90',
              color: '#2E8B57',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '25px',
              fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease',
              minWidth: '150px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#98FB98'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#90EE90'}
          >
            Start {currentExercise.name}
          </button>
        ) : (
          <button
            onClick={stopExercise}
            style={{
              backgroundColor: '#FF6B6B',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '25px',
              fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease',
              minWidth: '150px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#FF8E8E'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#FF6B6B'}
          >
            Stop Exercise
          </button>
        )}
        
        <button
          onClick={resetCounters}
          style={{
            backgroundColor: '#FFD700',
            color: '#2E8B57',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '25px',
            fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s ease',
            minWidth: '150px'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#FFE55C'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#FFD700'}
        >
          Reset Counters
        </button>
      </div>

      {/* Status and Feedback */}
      <div style={{ width: '100%', maxWidth: '800px' }}>
        <p style={{ 
          fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
          color: '#2E8B57',
          fontWeight: '500',
          textAlign: 'center',
          marginBottom: '15px'
        }}>
          Status: {isDetecting ? (isExerciseStarted ? 'Tracking Exercise' : 'Ready to Start') : 'Initializing...'}
        </p>
        
        {feedback && (
          <div style={{
            marginBottom: '15px',
            padding: '15px',
            backgroundColor: getStatusColor(),
            color: formStatus === 'good' ? '#2E8B57' : '#333',
            borderRadius: '10px',
            fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
            fontWeight: '500',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            {feedback}
          </div>
        )}
        
        {/* Exercise Instructions */}
        <div style={{ 
          padding: '15px',
          backgroundColor: '#E8F5E8',
          borderRadius: '10px',
          border: '2px solid #90EE90'
        }}>
          <h3 style={{ color: '#2E8B57', marginBottom: '10px', textAlign: 'center' }}>Exercise Instructions:</h3>
          <ul style={{ 
            textAlign: 'left',
            color: '#2E8B57',
            lineHeight: '1.6',
            paddingLeft: '20px',
            margin: 0
          }}>
            {currentExercise.instructions.map((instruction, index) => (
              <li key={index} style={{ marginBottom: '5px' }}>{instruction}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// Utility function to calculate angle between three points
const calculateAngle = (point1, point2, point3) => {
  const radians = Math.atan2(point3.y - point2.y, point3.x - point2.x) -
                 Math.atan2(point1.y - point2.y, point1.x - point2.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
};

export default PoseDetector;
