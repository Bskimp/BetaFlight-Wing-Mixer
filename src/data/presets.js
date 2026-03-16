export const AIRFRAME_PRESETS = {
  flying_wing: {
    name: 'Flying Wing (Elevon)',
    description: '2 elevons, 1-2 motors',
    motors: [
      { id: 0, label: 'Motor 1', throttle: 1.0, roll: 0, pitch: 0, yaw: 0 },
    ],
    servos: [
      { id: 0, label: 'Left Elevon', roll: 100, pitch: 100, yaw: 0 },
      { id: 1, label: 'Right Elevon', roll: -100, pitch: 100, yaw: 0 },
    ],
    diffThrust: false,
    yawType: 'SERVO',
  },
  flying_wing_dt: {
    name: 'Flying Wing (Diff Thrust)',
    description: '2 elevons, 2 motors with differential thrust yaw',
    motors: [
      { id: 0, label: 'Left Motor', throttle: 1.0, roll: 0, pitch: 0, yaw: -0.25 },
      { id: 1, label: 'Right Motor', throttle: 1.0, roll: 0, pitch: 0, yaw: 0.25 },
    ],
    servos: [
      { id: 0, label: 'Left Elevon', roll: 100, pitch: 100, yaw: 0 },
      { id: 1, label: 'Right Elevon', roll: -100, pitch: 100, yaw: 0 },
    ],
    diffThrust: true,
    yawType: 'DIFF_THRUST',
  },
  airplane: {
    name: 'Conventional Airplane',
    description: 'Ailerons, elevator, rudder, 1 motor',
    motors: [
      { id: 0, label: 'Motor 1', throttle: 1.0, roll: 0, pitch: 0, yaw: 0 },
    ],
    servos: [
      { id: 0, label: 'Left Aileron', roll: 100, pitch: 0, yaw: 0 },
      { id: 1, label: 'Right Aileron', roll: -100, pitch: 0, yaw: 0 },
      { id: 2, label: 'Elevator', roll: 0, pitch: 100, yaw: 0 },
      { id: 3, label: 'Rudder', roll: 0, pitch: 0, yaw: 100 },
    ],
    diffThrust: false,
    yawType: 'SERVO',
  },
  airplane_dt: {
    name: 'Airplane (Diff Thrust)',
    description: 'Ailerons, elevator, 2 motors with differential thrust yaw',
    motors: [
      { id: 0, label: 'Left Motor', throttle: 1.0, roll: 0, pitch: 0, yaw: -0.25 },
      { id: 1, label: 'Right Motor', throttle: 1.0, roll: 0, pitch: 0, yaw: 0.25 },
    ],
    servos: [
      { id: 0, label: 'Left Aileron', roll: 100, pitch: 0, yaw: 0 },
      { id: 1, label: 'Right Aileron', roll: -100, pitch: 0, yaw: 0 },
      { id: 2, label: 'Elevator', roll: 0, pitch: 100, yaw: 0 },
    ],
    diffThrust: true,
    yawType: 'DIFF_THRUST',
  },
  vtail: {
    name: 'V-Tail Airplane',
    description: 'Ailerons, v-tail surfaces, 1 motor',
    motors: [
      { id: 0, label: 'Motor 1', throttle: 1.0, roll: 0, pitch: 0, yaw: 0 },
    ],
    servos: [
      { id: 0, label: 'Left Aileron', roll: 100, pitch: 0, yaw: 0 },
      { id: 1, label: 'Right Aileron', roll: -100, pitch: 0, yaw: 0 },
      { id: 2, label: 'Left V-Tail', roll: 0, pitch: 100, yaw: 100 },
      { id: 3, label: 'Right V-Tail', roll: 0, pitch: 100, yaw: -100 },
    ],
    diffThrust: false,
    yawType: 'SERVO',
  },
};
