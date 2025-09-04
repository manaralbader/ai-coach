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
  
  // Enhanced Rep and Set counting with motion phases
  const [currentRep, setCurrentRep] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [totalSets, setTotalSets] = useState(0);
  const [phase, setPhase] = useState('start'); // 'up', 'down', 'extended', 'contracted', 'standing', 'squat'
  const [smoothedAngles, setSmoothedAngles] = useState({});
  const [poseConfidence, setPoseConfidence] = useState(0);
  
  // Advanced features
  const [formScore, setFormScore] = useState(100);
  const [sessionData, setSessionData] = useState({
    totalReps: 0,
    correctReps: 0,
    formErrors: [],
    averageConfidence: 0,
    exerciseTime: 0
  });
  const [movementVelocity, setMovementVelocity] = useState({});
  const [angleHistory, setAngleHistory] = useState({});
  const [processingTime, setProcessingTime] = useState(0);
  
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
          const startTime = performance.now();
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
            // Calculate pose confidence
            const confidence = calculatePoseConfidence(results.poseLandmarks);
            setPoseConfidence(confidence);
            
            // Calculate movement velocity for optical flow
            const velocity = calculateMovementVelocity(results.poseLandmarks);
            setMovementVelocity(velocity);
            
            // Draw continuous skeletal structure with proper connections
            drawConnectors(canvasCtx, results.poseLandmarks, pose.POSE_CONNECTIONS,
              { color: '#90EE90', lineWidth: 3 }); // Light green for skeleton lines
            
            // Draw landmark points
            drawLandmarks(canvasCtx, results.poseLandmarks,
              { color: '#98FB98', lineWidth: 2, radius: 4 }); // Pale green for landmarks

            // Validate form and count reps if exercise is started
            if (isExerciseStarted) {
              const currentExercise = EXERCISE_RULES[selectedExercise];
              
              if (currentExercise && currentExercise.validation) {
                const formValidation = currentExercise.validation(results.poseLandmarks);
                setFeedback(formValidation.feedback);
                setFormStatus(formValidation.status);
                
                // Update form score
                if (formValidation.formScore !== undefined) {
                  setFormScore(formValidation.formScore);
                }
                
                // Update session data
                updateSessionData(formValidation, confidence);
                
                // Enhanced rep counting with motion phases and movement detection
                handleEnhancedRepCounting(results.poseLandmarks, formValidation, velocity);
              } else {
                console.error('Exercise rules not found for:', selectedExercise);
                setFeedback('Exercise rules not loaded properly');
                setFormStatus('error');
              }
            }
            
            // Measure processing time
            const endTime = performance.now();
            setProcessingTime(endTime - startTime);
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

  // Enhanced rep counting with motion phase detection and optical flow
  const handleEnhancedRepCounting = (landmarks, formValidation, velocity) => {
    // Only count reps if there's significant movement (optical flow threshold)
    const hasMovement = Object.values(velocity).some(v => v && v.magnitude > 0.01);
    
    if (!hasMovement) {
      return; // Don't count reps if user is just holding position
    }
    
    switch (selectedExercise) {
      case 'bicepCurls':
        handleBicepCurlRepCounting(landmarks, velocity);
        break;
      case 'squats':
        handleSquatRepCounting(landmarks, velocity);
        break;
      case 'frontKicks':
        handleFrontKickRepCounting(landmarks, velocity);
        break;
    }
  };

  // Bicep curl rep counting: Extended → Contracted → Extended
  const handleBicepCurlRepCounting = (landmarks, velocity) => {
    const upperArmForearmAngle = getSmoothedAngle('bicepCurl', calculateAngle(
      landmarks[11], // LEFT_SHOULDER
      landmarks[13], // LEFT_ELBOW
      landmarks[15]  // LEFT_WRIST
    ));

    const extendedThreshold = 160;
    const contractedThreshold = 70;

    if (phase !== 'contracted' && upperArmForearmAngle < contractedThreshold) {
      setPhase('contracted');
    } else if (phase === 'contracted' && upperArmForearmAngle > extendedThreshold) {
      // Rep completed: went from contracted back to extended
      const wasCorrectRep = formScore >= 70; // Consider rep correct if form score >= 70%
      
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
      
      // Update session data
      setSessionData(prev => ({
        ...prev,
        totalReps: prev.totalReps + 1,
        correctReps: prev.correctReps + (wasCorrectRep ? 1 : 0)
      }));
      
      setPhase('extended');
    } else if (upperArmForearmAngle > extendedThreshold) {
      setPhase('extended');
    }
  };

  // Squat rep counting: Standing → Squat → Standing
  const handleSquatRepCounting = (landmarks, velocity) => {
    const hipAngle = getSmoothedAngle('squat', calculateAngle(
      landmarks[11], // LEFT_SHOULDER
      landmarks[23], // LEFT_HIP
      landmarks[25]  // LEFT_KNEE
    ));

    const standingThreshold = 160;
    const squatThreshold = 70;

    if (phase !== 'squat' && hipAngle < squatThreshold) {
      setPhase('squat');
    } else if (phase === 'squat' && hipAngle > standingThreshold) {
      // Rep completed: went from squat back to standing
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
      setPhase('standing');
    } else if (hipAngle > standingThreshold) {
      setPhase('standing');
    }
  };

  // Front kick rep counting: Extended → Retracted → Extended
  const handleFrontKickRepCounting = (landmarks, velocity) => {
    const legAngle = getSmoothedAngle('frontKick', calculateAngle(
      landmarks[23], // LEFT_HIP
      landmarks[25], // LEFT_KNEE
      landmarks[27]  // LEFT_ANKLE
    ));

    const extendedThreshold = 120;
    const retractedThreshold = 110;

    if (phase !== 'retracted' && legAngle < retractedThreshold) {
      setPhase('retracted');
    } else if (phase === 'retracted' && legAngle > extendedThreshold) {
      // Rep completed: went from retracted back to extended
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
      setPhase('extended');
    } else if (legAngle > extendedThreshold) {
      setPhase('extended');
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
    console.log('Starting exercise:', selectedExercise);
    console.log('Exercise rules available:', EXERCISE_RULES[selectedExercise]);
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
    console.log('Exercise changed to:', exercise);
    setSelectedExercise(exercise);
    setIsExerciseStarted(false);
    setFeedback('');
    setFormStatus('neutral');
    resetTimer();
    setCurrentRep(0);
    setCurrentSet(1);
    setPhase('start');
    setSmoothedAngles({});
    setPoseConfidence(0);
  };

  const resetCounters = () => {
    setCurrentRep(0);
    setCurrentSet(1);
    setTotalSets(0);
    setPhase('start');
    setSmoothedAngles({});
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

  // Smooth noisy MediaPipe data with temporal smoothing
  const getSmoothedAngle = (key, currentAngle) => {
    setSmoothedAngles(prev => {
      const prevAngle = prev[key] || currentAngle;
      const smoothedAngle = (prevAngle * 0.7) + (currentAngle * 0.3);
      return { ...prev, [key]: smoothedAngle };
    });
    return smoothedAngles[key] || currentAngle;
  };

  // Calculate movement velocity for optical flow detection
  const calculateMovementVelocity = (landmarks) => {
    const currentTime = Date.now();
    const keyJoints = [11, 13, 15, 23, 25, 27]; // shoulder, elbow, wrist, hip, knee, ankle
    
    setAngleHistory(prev => {
      const newHistory = { ...prev };
      const timeDiff = currentTime - (prev.lastTime || currentTime);
      
      keyJoints.forEach(jointIndex => {
        if (landmarks[jointIndex]) {
          const currentPos = { x: landmarks[jointIndex].x, y: landmarks[jointIndex].y };
          const prevPos = prev[jointIndex] || currentPos;
          
          const velocity = {
            x: (currentPos.x - prevPos.x) / (timeDiff / 1000),
            y: (currentPos.y - prevPos.y) / (timeDiff / 1000),
            magnitude: Math.sqrt(Math.pow(currentPos.x - prevPos.x, 2) + Math.pow(currentPos.y - prevPos.y, 2)) / (timeDiff / 1000)
          };
          
          newHistory[jointIndex] = currentPos;
        }
      });
      
      newHistory.lastTime = currentTime;
      return newHistory;
    });
    
    return movementVelocity;
  };

  // Update session analytics
  const updateSessionData = (formValidation, confidence) => {
    setSessionData(prev => {
      const newData = { ...prev };
      
      // Update average confidence
      newData.averageConfidence = (prev.averageConfidence + confidence) / 2;
      
      // Track form errors
      if (formValidation.status === 'error' || formValidation.status === 'warning') {
        newData.formErrors.push({
          timestamp: Date.now(),
          error: formValidation.feedback,
          status: formValidation.status
        });
      }
      
      // Update exercise time
      newData.exerciseTime = elapsedTime;
      
      return newData;
    });
  };

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

        {/* Advanced Metrics Display */}
        {isExerciseStarted && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '10px',
            marginBottom: '15px'
          }}>
            {/* Current Phase */}
            <div style={{
              backgroundColor: '#E8F5E8',
              padding: '8px 15px',
              borderRadius: '8px',
              border: '2px solid #90EE90',
              textAlign: 'center'
            }}>
              <div style={{ color: '#2E8B57', fontWeight: '600', fontSize: '0.8rem' }}>Phase</div>
              <div style={{ color: '#2E8B57', fontSize: '1rem', fontWeight: '700', textTransform: 'capitalize' }}>
                {phase}
              </div>
            </div>

            {/* Form Score */}
            <div style={{
              backgroundColor: formScore >= 80 ? '#E8F5E8' : formScore >= 60 ? '#FFF3CD' : '#FFE6E6',
              padding: '8px 15px',
              borderRadius: '8px',
              border: `2px solid ${formScore >= 80 ? '#90EE90' : formScore >= 60 ? '#FFD700' : '#FF6B6B'}`,
              textAlign: 'center'
            }}>
              <div style={{ color: '#2E8B57', fontWeight: '600', fontSize: '0.8rem' }}>Form Score</div>
              <div style={{ color: '#2E8B57', fontSize: '1rem', fontWeight: '700' }}>
                {formScore}%
              </div>
            </div>

            {/* Pose Confidence */}
            <div style={{
              backgroundColor: poseConfidence >= 0.8 ? '#E8F5E8' : '#FFF3CD',
              padding: '8px 15px',
              borderRadius: '8px',
              border: `2px solid ${poseConfidence >= 0.8 ? '#90EE90' : '#FFD700'}`,
              textAlign: 'center'
            }}>
              <div style={{ color: '#2E8B57', fontWeight: '600', fontSize: '0.8rem' }}>Confidence</div>
              <div style={{ color: '#2E8B57', fontSize: '1rem', fontWeight: '700' }}>
                {Math.round(poseConfidence * 100)}%
              </div>
            </div>

            {/* Processing Time */}
            <div style={{
              backgroundColor: processingTime < 50 ? '#E8F5E8' : '#FFF3CD',
              padding: '8px 15px',
              borderRadius: '8px',
              border: `2px solid ${processingTime < 50 ? '#90EE90' : '#FFD700'}`,
              textAlign: 'center'
            }}>
              <div style={{ color: '#2E8B57', fontWeight: '600', fontSize: '0.8rem' }}>Processing</div>
              <div style={{ color: '#2E8B57', fontSize: '1rem', fontWeight: '700' }}>
                {Math.round(processingTime)}ms
              </div>
            </div>
          </div>
        )}
        
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
        
        {/* Session Analytics */}
        {isExerciseStarted && (
          <div style={{ 
            padding: '15px',
            backgroundColor: '#E8F5E8',
            borderRadius: '10px',
            border: '2px solid #90EE90',
            marginBottom: '15px'
          }}>
            <h3 style={{ color: '#2E8B57', marginBottom: '10px', textAlign: 'center' }}>Session Analytics:</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '10px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ color: '#2E8B57', fontWeight: '600', fontSize: '0.9rem' }}>Total Reps</div>
                <div style={{ color: '#2E8B57', fontSize: '1.2rem', fontWeight: '700' }}>{sessionData.totalReps}</div>
              </div>
              <div>
                <div style={{ color: '#2E8B57', fontWeight: '600', fontSize: '0.9rem' }}>Correct Reps</div>
                <div style={{ color: '#2E8B57', fontSize: '1.2rem', fontWeight: '700' }}>{sessionData.correctReps}</div>
              </div>
              <div>
                <div style={{ color: '#2E8B57', fontWeight: '600', fontSize: '0.9rem' }}>Accuracy</div>
                <div style={{ color: '#2E8B57', fontSize: '1.2rem', fontWeight: '700' }}>
                  {sessionData.totalReps > 0 ? Math.round((sessionData.correctReps / sessionData.totalReps) * 100) : 0}%
                </div>
              </div>
              <div>
                <div style={{ color: '#2E8B57', fontWeight: '600', fontSize: '0.9rem' }}>Avg Confidence</div>
                <div style={{ color: '#2E8B57', fontSize: '1.2rem', fontWeight: '700' }}>
                  {Math.round(sessionData.averageConfidence * 100)}%
                </div>
              </div>
            </div>
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

// Smooth noisy MediaPipe data - this will be defined inside the component

// Calculate pose confidence based on landmark visibility
const calculatePoseConfidence = (landmarks) => {
  if (!landmarks || landmarks.length === 0) return 0;
  
  // Key landmarks for pose confidence
  const keyLandmarks = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]; // shoulders, elbows, wrists, hips, knees, ankles
  let visibleCount = 0;
  
  keyLandmarks.forEach(index => {
    if (landmarks[index] && landmarks[index].visibility && landmarks[index].visibility > 0.3) {
      visibleCount++;
    }
  });
  
  const confidence = visibleCount / keyLandmarks.length;
  console.log('Confidence calculation:', { visibleCount, total: keyLandmarks.length, confidence });
  return confidence;
};

export default PoseDetector;
