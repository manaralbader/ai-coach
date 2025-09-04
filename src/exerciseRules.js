// Utility function to calculate angle between three points
const calculateAngle = (point1, point2, point3) => {
  const radians = Math.atan2(point3.y - point2.y, point3.x - point2.x) -
                 Math.atan2(point1.y - point2.y, point1.x - point2.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
};

// Calculate deviation percentage from ideal range
const calculateDeviation = (currentAngle, idealMin, idealMax) => {
  if (currentAngle >= idealMin && currentAngle <= idealMax) return 0;
  const idealMid = (idealMin + idealMax) / 2;
  return Math.abs((currentAngle - idealMid) / idealMid) * 100;
};

// Get feedback color based on deviation percentage
const getFeedbackColor = (deviation) => {
  if (deviation === 0) return { color: '#90EE90', status: 'perfect' }; // Green
  if (deviation <= 10) return { color: '#FFD700', status: 'good' }; // Yellow
  if (deviation <= 20) return { color: '#FF8C00', status: 'warning' }; // Orange
  return { color: '#FF6B6B', status: 'error' }; // Red
};

// Calculate overall form score (0-100%)
const calculateFormScore = (deviations) => {
  if (deviations.length === 0) return 100;
  const totalDeviation = deviations.reduce((sum, dev) => sum + dev, 0);
  const averageDeviation = totalDeviation / deviations.length;
  return Math.max(0, 100 - averageDeviation);
};

// MediaPipe Pose landmark indices
const LANDMARKS = {
  LEFT_SHOULDER: 11,
  LEFT_ELBOW: 13,
  LEFT_WRIST: 15,
  LEFT_HIP: 23,
  LEFT_KNEE: 25,
  LEFT_ANKLE: 27,
  RIGHT_SHOULDER: 12,
  RIGHT_ELBOW: 14,
  RIGHT_WRIST: 16,
  RIGHT_HIP: 24,
  RIGHT_KNEE: 26,
  RIGHT_ANKLE: 28
};

export const EXERCISE_RULES = {
  bicepCurls: {
    name: 'Bicep Curls',
    description: 'Stand with your arm at your side and curl your forearm toward your shoulder.',
    instructions: [
      'Keep your upper arm close to your torso (angle < 35°)',
      'Curl your arm to bring your hand close to your shoulder (angle < 70°)',
      'Maintain good posture throughout the exercise',
      'Follow the real-time feedback for proper form'
    ],
    validation: (landmarks) => {
      // Calculate torso-upper arm angle (shoulder to elbow to hip)
      const torsoUpperArmAngle = calculateAngle(
        landmarks[LANDMARKS.LEFT_HIP],
        landmarks[LANDMARKS.LEFT_SHOULDER],
        landmarks[LANDMARKS.LEFT_ELBOW]
      );

      // Calculate upper arm-forearm angle (shoulder to elbow to wrist)
      const upperArmForearmAngle = calculateAngle(
        landmarks[LANDMARKS.LEFT_SHOULDER],
        landmarks[LANDMARKS.LEFT_ELBOW],
        landmarks[LANDMARKS.LEFT_WRIST]
      );

      // Calculate deviations from ideal ranges
      const torsoDeviation = calculateDeviation(torsoUpperArmAngle, 0, 35);
      const armDeviation = calculateDeviation(upperArmForearmAngle, 30, 70);
      
      // Get feedback colors for each joint
      const torsoFeedback = getFeedbackColor(torsoDeviation);
      const armFeedback = getFeedbackColor(armDeviation);
      
      // Calculate overall form score
      const formScore = calculateFormScore([torsoDeviation, armDeviation]);
      
      // Determine primary feedback (worst deviation)
      const primaryDeviation = Math.max(torsoDeviation, armDeviation);
      const primaryFeedback = getFeedbackColor(primaryDeviation);
      
      let feedback = '';
      
      // Generate specific feedback messages
      if (torsoDeviation > armDeviation) {
        if (torsoDeviation === 0) {
          feedback = `Perfect torso position (${torsoUpperArmAngle.toFixed(1)}°)`;
        } else {
          feedback = `Torso angle is ${torsoUpperArmAngle.toFixed(1)}° - keep upper arm closer to torso (ideal: 0-35°)`;
        }
      } else {
        if (armDeviation === 0) {
          feedback = `Perfect arm curl (${upperArmForearmAngle.toFixed(1)}°)`;
        } else {
          feedback = `Arm angle is ${upperArmForearmAngle.toFixed(1)}° - curl more to reach 30-70° range`;
        }
      }

      return { 
        isValid: primaryDeviation <= 10, 
        feedback, 
        status: primaryFeedback.status,
        formScore: Math.round(formScore),
        deviations: { torso: torsoDeviation, arm: armDeviation }
      };
    },
    repDetection: (landmarks) => {
      const upperArmForearmAngle = calculateAngle(
        landmarks[LANDMARKS.LEFT_SHOULDER],
        landmarks[LANDMARKS.LEFT_ELBOW],
        landmarks[LANDMARKS.LEFT_WRIST]
      );
      
      // Rep is counted when arm goes from extended (>120°) to contracted (<60°) and back
      return {
        isInRepPosition: upperArmForearmAngle < 60,
        isRepCompleted: upperArmForearmAngle > 120
      };
    }
  },

  frontKicks: {
    name: 'Front Kicks',
    description: 'Stand on one leg and kick forward with the other leg, keeping it straight.',
    instructions: [
      'Extend your leg fully during the kick (angle > 120°)',
      'Keep your torso upright during the kick (hip angle 71-120°)',
      'Maintain balance on your standing leg',
      'Follow the real-time feedback for proper form'
    ],
    validation: (landmarks) => {
      // Calculate leg angle (hip to knee to ankle)
      const legAngle = calculateAngle(
        landmarks[LANDMARKS.LEFT_HIP],
        landmarks[LANDMARKS.LEFT_KNEE],
        landmarks[LANDMARKS.LEFT_ANKLE]
      );

      // Calculate hip angle (shoulder to hip to knee)
      const hipAngle = calculateAngle(
        landmarks[LANDMARKS.LEFT_SHOULDER],
        landmarks[LANDMARKS.LEFT_HIP],
        landmarks[LANDMARKS.LEFT_KNEE]
      );

      // Calculate deviations from ideal ranges
      const legDeviation = calculateDeviation(legAngle, 120, 180); // Ideal: >120°
      const hipDeviation = calculateDeviation(hipAngle, 71, 120);
      
      // Calculate overall form score
      const formScore = calculateFormScore([legDeviation, hipDeviation]);
      
      // Determine primary feedback (worst deviation)
      const primaryDeviation = Math.max(legDeviation, hipDeviation);
      const primaryFeedback = getFeedbackColor(primaryDeviation);
      
      let feedback = '';
      
      // Generate specific feedback messages
      if (legDeviation > hipDeviation) {
        if (legDeviation === 0) {
          feedback = `Perfect leg extension (${legAngle.toFixed(1)}°)`;
        } else {
          feedback = `Leg angle is ${legAngle.toFixed(1)}° - extend leg more for straight kick (ideal: >120°)`;
        }
      } else {
        if (hipDeviation === 0) {
          feedback = `Perfect torso position (${hipAngle.toFixed(1)}°)`;
        } else {
          feedback = `Hip angle is ${hipAngle.toFixed(1)}° - keep torso more upright (ideal: 71-120°)`;
        }
      }

      return { 
        isValid: primaryDeviation <= 10, 
        feedback, 
        status: primaryFeedback.status,
        formScore: Math.round(formScore),
        deviations: { leg: legDeviation, hip: hipDeviation }
      };
    },
    repDetection: (landmarks) => {
      const legAngle = calculateAngle(
        landmarks[LANDMARKS.LEFT_HIP],
        landmarks[LANDMARKS.LEFT_KNEE],
        landmarks[LANDMARKS.LEFT_ANKLE]
      );
      
      // Rep is counted when leg goes from extended (>120°) to retracted (<90°) and back
      return {
        isInRepPosition: legAngle > 120,
        isRepCompleted: legAngle < 90
      };
    }
  },

  squats: {
    name: 'Squats',
    description: 'Stand with feet shoulder-width apart and lower your body by bending your knees.',
    instructions: [
      'Squat to the proper depth (hip angle 50-71°)',
      'Bend your knees adequately (knee angle 55-68°)',
      'Keep your chest up (torso angle 35-43°)',
      'Keep weight on your heels (ankle angle 75-85°)'
    ],
    validation: (landmarks) => {
      // Calculate hip angle (shoulder to hip to knee)
      const hipAngle = calculateAngle(
        landmarks[LANDMARKS.LEFT_SHOULDER],
        landmarks[LANDMARKS.LEFT_HIP],
        landmarks[LANDMARKS.LEFT_KNEE]
      );

      // Calculate knee angle (hip to knee to ankle)
      const kneeAngle = calculateAngle(
        landmarks[LANDMARKS.LEFT_HIP],
        landmarks[LANDMARKS.LEFT_KNEE],
        landmarks[LANDMARKS.LEFT_ANKLE]
      );

      // Calculate torso angle (shoulder to hip relative to vertical)
      const torsoAngle = calculateAngle(
        { x: landmarks[LANDMARKS.LEFT_SHOULDER].x, y: landmarks[LANDMARKS.LEFT_SHOULDER].y - 1 },
        landmarks[LANDMARKS.LEFT_SHOULDER],
        landmarks[LANDMARKS.LEFT_HIP]
      );

      // Calculate ankle angle (knee to ankle to foot)
      const ankleAngle = calculateAngle(
        landmarks[LANDMARKS.LEFT_KNEE],
        landmarks[LANDMARKS.LEFT_ANKLE],
        { x: landmarks[LANDMARKS.LEFT_ANKLE].x, y: landmarks[LANDMARKS.LEFT_ANKLE].y + 1 }
      );

      // Calculate deviations from ideal ranges
      const hipDeviation = calculateDeviation(hipAngle, 50, 71);
      const kneeDeviation = calculateDeviation(kneeAngle, 55, 68);
      const torsoDeviation = calculateDeviation(torsoAngle, 35, 43);
      const ankleDeviation = calculateDeviation(ankleAngle, 75, 85);
      
      // Calculate overall form score
      const formScore = calculateFormScore([hipDeviation, kneeDeviation, torsoDeviation, ankleDeviation]);
      
      // Determine primary feedback (worst deviation)
      const deviations = { hip: hipDeviation, knee: kneeDeviation, torso: torsoDeviation, ankle: ankleDeviation };
      const primaryDeviation = Math.max(...Object.values(deviations));
      const primaryFeedback = getFeedbackColor(primaryDeviation);
      
      let feedback = '';
      
      // Generate specific feedback messages with priority order
      if (kneeDeviation === primaryDeviation) {
        feedback = `Knee angle is ${kneeAngle.toFixed(1)}° - ${kneeAngle > 68 ? 'bend knees more' : 'reduce knee bend'} (ideal: 55-68°)`;
      } else if (hipDeviation === primaryDeviation) {
        feedback = `Hip angle is ${hipAngle.toFixed(1)}° - ${hipAngle > 71 ? 'squat deeper' : 'come up slightly'} (ideal: 50-71°)`;
      } else if (torsoDeviation === primaryDeviation) {
        feedback = `Torso angle is ${torsoAngle.toFixed(1)}° - keep chest up (ideal: 35-43°)`;
      } else if (ankleDeviation === primaryDeviation) {
        feedback = `Ankle angle is ${ankleAngle.toFixed(1)}° - keep weight on heels (ideal: 75-85°)`;
      } else {
        feedback = `Perfect squat form! All angles within range.`;
      }

      return { 
        isValid: primaryDeviation <= 10, 
        feedback, 
        status: primaryFeedback.status,
        formScore: Math.round(formScore),
        deviations
      };
    },
    repDetection: (landmarks) => {
      const hipAngle = calculateAngle(
        landmarks[LANDMARKS.LEFT_SHOULDER],
        landmarks[LANDMARKS.LEFT_HIP],
        landmarks[LANDMARKS.LEFT_KNEE]
      );
      
      // Rep is counted when going from standing (>150°) to squat (<80°) and back
      return {
        isInRepPosition: hipAngle < 80,
        isRepCompleted: hipAngle > 150
      };
    }
  }
};
