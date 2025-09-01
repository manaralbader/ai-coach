// Utility function to calculate angle between three points
const calculateAngle = (point1, point2, point3) => {
  const radians = Math.atan2(point3.y - point2.y, point3.x - point2.x) -
                 Math.atan2(point1.y - point2.y, point1.x - point2.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
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

      let feedback = '';
      let status = 'good';

      // Check torso-upper arm angle
      if (torsoUpperArmAngle > 45) {
        feedback = 'Lower your arm - keep your upper arm closer to your torso';
        status = 'error';
      }
      // Check upper arm-forearm angle during contraction
      else if (upperArmForearmAngle > 70) {
        feedback = 'Curl your arm more - bring your hand closer to your shoulder';
        status = 'warning';
      }
      else if (upperArmForearmAngle < 30) {
        feedback = 'Good form! Keep going!';
        status = 'good';
      }

      return { isValid: status === 'good', feedback, status };
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

      let feedback = '';
      let status = 'good';

      // Check leg extension
      if (legAngle < 110) {
        feedback = 'Extend your leg more - straighten your kick';
        status = 'error';
      }
      // Check torso position
      else if (hipAngle > 130) {
        feedback = 'Keep your torso more upright during the kick';
        status = 'error';
      }
      else if (legAngle > 120 && hipAngle >= 71 && hipAngle <= 120) {
        feedback = 'Perfect kick form! Keep going!';
        status = 'good';
      }

      return { isValid: status === 'good', feedback, status };
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

      let feedback = '';
      let status = 'good';

      // Check squat depth
      if (hipAngle < 44) {
        feedback = 'Don\'t squat too deep - come up slightly';
        status = 'error';
      }
      // Check knee bend
      else if (kneeAngle > 75) {
        feedback = 'Squat deeper - bend your knees more';
        status = 'error';
      }
      // Check torso position
      else if (torsoAngle > 45) {
        feedback = 'Keep your chest up - don\'t lean forward too much';
        status = 'error';
      }
      // Check ankle position
      else if (ankleAngle < 75) {
        feedback = 'Keep your weight on your heels';
        status = 'error';
      }
      else if (hipAngle >= 50 && hipAngle <= 71 && 
               kneeAngle >= 55 && kneeAngle <= 68 &&
               torsoAngle >= 35 && torsoAngle <= 43 &&
               ankleAngle >= 75 && ankleAngle <= 85) {
        feedback = 'Perfect squat form! Keep going!';
        status = 'good';
      }

      return { isValid: status === 'good', feedback, status };
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
