import { LM } from './constants.js';

export function calcAngle3D(a, b, c) {
  if (!a || !b || !c ||
      typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number' ||
      typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number' ||
      typeof c.x !== 'number' || typeof c.y !== 'number' || typeof c.z !== 'number') {
    return 0;
  }

  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y + ba.z * ba.z);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z);

  if (magBA === 0 || magBC === 0 || Number.isNaN(magBA) || Number.isNaN(magBC)) return 0;

  const cosAngle = dot / (magBA * magBC);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  return Number.isFinite(angle) ? angle : 0;
}

export function calcJointAngles(worldLandmarks) {
  if (!worldLandmarks || worldLandmarks.length < 33) return null;

  return {
    leftHip: calcAngle3D(worldLandmarks[LM.LEFT_SHOULDER], worldLandmarks[LM.LEFT_HIP], worldLandmarks[LM.LEFT_KNEE]),
    rightHip: calcAngle3D(worldLandmarks[LM.RIGHT_SHOULDER], worldLandmarks[LM.RIGHT_HIP], worldLandmarks[LM.RIGHT_KNEE]),
    leftKnee: calcAngle3D(worldLandmarks[LM.LEFT_HIP], worldLandmarks[LM.LEFT_KNEE], worldLandmarks[LM.LEFT_ANKLE]),
    rightKnee: calcAngle3D(worldLandmarks[LM.RIGHT_HIP], worldLandmarks[LM.RIGHT_KNEE], worldLandmarks[LM.RIGHT_ANKLE]),
    leftAnkle: calcAngle3D(worldLandmarks[LM.LEFT_KNEE], worldLandmarks[LM.LEFT_ANKLE], worldLandmarks[LM.LEFT_FOOT_INDEX]),
    rightAnkle: calcAngle3D(worldLandmarks[LM.RIGHT_KNEE], worldLandmarks[LM.RIGHT_ANKLE], worldLandmarks[LM.RIGHT_FOOT_INDEX])
  };
}

export function calcTrunkAngle(worldLandmarks, logger = console) {
  if (!worldLandmarks || worldLandmarks.length < 33) {
    logger.warn?.('[Trunk] Invalid world landmarks (length:', worldLandmarks ? worldLandmarks.length : 'null', ')');
    return 0;
  }

  const shoulderMid = {
    x: (worldLandmarks[LM.LEFT_SHOULDER].x + worldLandmarks[LM.RIGHT_SHOULDER].x) / 2,
    y: (worldLandmarks[LM.LEFT_SHOULDER].y + worldLandmarks[LM.RIGHT_SHOULDER].y) / 2,
    z: (worldLandmarks[LM.LEFT_SHOULDER].z + worldLandmarks[LM.RIGHT_SHOULDER].z) / 2
  };
  const hipMid = {
    x: (worldLandmarks[LM.LEFT_HIP].x + worldLandmarks[LM.RIGHT_HIP].x) / 2,
    y: (worldLandmarks[LM.LEFT_HIP].y + worldLandmarks[LM.RIGHT_HIP].y) / 2,
    z: (worldLandmarks[LM.LEFT_HIP].z + worldLandmarks[LM.RIGHT_HIP].z) / 2
  };

  const dy = hipMid.y - shoulderMid.y;
  const dz = shoulderMid.z - hipMid.z;
  const angle = Math.abs(Math.atan2(dz, dy) * (180 / Math.PI));

  if (Math.random() < 0.01) {
    logger.log?.('[Trunk] dy:', dy.toFixed(4), '| dz:', dz.toFixed(4), '| angle:', angle.toFixed(2), '°');
  }

  return Number.isFinite(angle) ? angle : 0;
}

export function calcPelvicTilt(worldLandmarks) {
  if (!worldLandmarks || worldLandmarks.length < 33) return 0;
  const dy = worldLandmarks[LM.RIGHT_HIP].y - worldLandmarks[LM.LEFT_HIP].y;
  const dx = worldLandmarks[LM.RIGHT_HIP].x - worldLandmarks[LM.LEFT_HIP].x;
  return Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
}

export function calcWalkingSpeed(worldLandmarks, previousWorldLandmarks, deltaT, logger = console) {
  if (!worldLandmarks || !previousWorldLandmarks || !deltaT || deltaT <= 0 || worldLandmarks.length < 33 || previousWorldLandmarks.length < 33) {
    return 0;
  }

  const hipMid = {
    x: (worldLandmarks[LM.LEFT_HIP].x + worldLandmarks[LM.RIGHT_HIP].x) / 2,
    y: (worldLandmarks[LM.LEFT_HIP].y + worldLandmarks[LM.RIGHT_HIP].y) / 2,
    z: (worldLandmarks[LM.LEFT_HIP].z + worldLandmarks[LM.RIGHT_HIP].z) / 2
  };
  const prevHipMid = {
    x: (previousWorldLandmarks[LM.LEFT_HIP].x + previousWorldLandmarks[LM.RIGHT_HIP].x) / 2,
    y: (previousWorldLandmarks[LM.LEFT_HIP].y + previousWorldLandmarks[LM.RIGHT_HIP].y) / 2,
    z: (previousWorldLandmarks[LM.LEFT_HIP].z + previousWorldLandmarks[LM.RIGHT_HIP].z) / 2
  };

  const displacement = Math.sqrt(
    Math.pow(hipMid.x - prevHipMid.x, 2) +
    Math.pow(hipMid.y - prevHipMid.y, 2) +
    Math.pow(hipMid.z - prevHipMid.z, 2)
  );

  const shoulderWidth = Math.sqrt(
    Math.pow(worldLandmarks[LM.LEFT_SHOULDER].x - worldLandmarks[LM.RIGHT_SHOULDER].x, 2) +
    Math.pow(worldLandmarks[LM.LEFT_SHOULDER].y - worldLandmarks[LM.RIGHT_SHOULDER].y, 2) +
    Math.pow(worldLandmarks[LM.LEFT_SHOULDER].z - worldLandmarks[LM.RIGHT_SHOULDER].z, 2)
  );

  if (shoulderWidth < 0.05 || Number.isNaN(shoulderWidth)) {
    return 0;
  }

  const scaledDisplacement = (displacement / shoulderWidth) * 0.4;
  const speedMps = scaledDisplacement / (deltaT / 1000);

  if (Math.random() < 0.01) {
    logger.log?.('[Speed] displacement:', displacement.toFixed(5), '| shoulderWidth:', shoulderWidth.toFixed(3), '| scaled:', scaledDisplacement.toFixed(5), 'm | deltaT:', deltaT.toFixed(1), 'ms | speed:', speedMps.toFixed(3), 'm/s');
  }

  if (Number.isNaN(speedMps) || speedMps < 0 || speedMps > 5) {
    logger.warn?.('[Speed] Out of range:', speedMps.toFixed(3), 'm/s | displacement:', displacement.toFixed(4), '| shoulderWidth:', shoulderWidth.toFixed(3), '| deltaT:', deltaT.toFixed(1), 'ms');
    return Math.max(0, Math.min(3, speedMps));
  }

  return speedMps;
}

export function calcSymmetryIndex(left, right) {
  if (typeof left !== 'number' || typeof right !== 'number' ||
      Number.isNaN(left) || Number.isNaN(right) || !Number.isFinite(left) || !Number.isFinite(right)) {
    return 100;
  }

  if (left === 0 && right === 0) return 100;
  const mean = (left + right) / 2;
  if (mean === 0) return 100;

  const symmetry = 100 - (Math.abs(left - right) / mean * 100);
  return Math.max(0, Math.min(100, symmetry));
}

export function detectGaitEvent({ landmarks, prevLandmarks, timestamp, lastHeelStrikeTime, logger = console, minIntervalMs = 250 }) {
  if (!landmarks || landmarks.length < 33 || !prevLandmarks || prevLandmarks.length < 33) {
    return { event: null, nextLastHeelStrikeTime: lastHeelStrikeTime, stepIncrement: 0 };
  }

  const leftHeelY = landmarks[LM.LEFT_HEEL].y;
  const rightHeelY = landmarks[LM.RIGHT_HEEL].y;
  const leftFootY = landmarks[LM.LEFT_FOOT_INDEX].y;
  const rightFootY = landmarks[LM.RIGHT_FOOT_INDEX].y;
  const leftKneeY = landmarks[LM.LEFT_KNEE].y;
  const rightKneeY = landmarks[LM.RIGHT_KNEE].y;
  const prevLeftHeelY = prevLandmarks[LM.LEFT_HEEL].y;
  const prevRightHeelY = prevLandmarks[LM.RIGHT_HEEL].y;

  const leftHeelDown = leftHeelY > prevLeftHeelY;
  const rightHeelDown = rightHeelY > prevRightHeelY;
  const leftHeelLow = leftHeelY > leftKneeY + 0.05;
  const rightHeelLow = rightHeelY > rightKneeY + 0.05;
  const leftFootFlat = Math.abs(leftHeelY - leftFootY) < 0.05;
  const rightFootFlat = Math.abs(rightHeelY - rightFootY) < 0.05;

  if (leftHeelDown && leftHeelLow && leftFootFlat && timestamp - lastHeelStrikeTime > minIntervalMs) {
    logger.log?.('[Gait] Left heel strike at', (timestamp / 1000).toFixed(2), 's');
    return {
      event: { type: 'left_heel_strike', timestamp },
      nextLastHeelStrikeTime: timestamp,
      stepIncrement: 1
    };
  }

  if (rightHeelDown && rightHeelLow && rightFootFlat && timestamp - lastHeelStrikeTime > minIntervalMs) {
    logger.log?.('[Gait] Right heel strike at', (timestamp / 1000).toFixed(2), 's');
    return {
      event: { type: 'right_heel_strike', timestamp },
      nextLastHeelStrikeTime: timestamp,
      stepIncrement: 1
    };
  }

  return { event: null, nextLastHeelStrikeTime: lastHeelStrikeTime, stepIncrement: 0 };
}

export function ema(prev, cur, alpha = 0.2) {
  return alpha * cur + (1 - alpha) * prev;
}
