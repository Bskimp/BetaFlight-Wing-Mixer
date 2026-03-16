/**
 * Parse a Betaflight diff/diff all output into a structured config object.
 * Handles all section types from real BF diffs.
 */
export function parseDiff(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim());

  const result = {
    version: null,
    boardName: null,
    manufacturer: null,
    mixerType: null,
    motors: [],
    servos: [],
    servoMix: [],
    resources: [],
    serial: [],
    features: [],
    master: {},
    profiles: {},
    rateProfiles: {},
    aux: [],
    map: null,
    rxrange: [],
    beacon: [],
    parseErrors: [],
    activeProfile: 0,
    activeRateProfile: 0,
  };

  let currentContext = 'master';

  for (const line of lines) {
    if (!line) continue;

    // Version comment
    if (line.startsWith('# Betaflight') || line.startsWith('# version')) {
      if (line.startsWith('# Betaflight')) {
        result.version = line.substring(2).trim();
      }
      continue;
    }

    // Skip other comments
    if (line.startsWith('#')) continue;

    // Context switches
    if (/^profile\s+\d+/.test(line)) {
      const num = parseInt(line.split(/\s+/)[1]);
      currentContext = `profile:${num}`;
      result.activeProfile = num;
      if (!result.profiles[num]) result.profiles[num] = {};
      continue;
    }
    if (/^rateprofile\s+\d+/.test(line)) {
      const num = parseInt(line.split(/\s+/)[1]);
      currentContext = `rateprofile:${num}`;
      result.activeRateProfile = num;
      if (!result.rateProfiles[num]) result.rateProfiles[num] = {};
      continue;
    }

    // Board identification
    if (line.startsWith('board_name ')) {
      result.boardName = line.split(/\s+/)[1];
      continue;
    }
    if (line.startsWith('manufacturer_id ')) {
      result.manufacturer = line.split(/\s+/)[1];
      continue;
    }

    // Feature
    if (line.startsWith('feature ')) {
      const feat = line.substring(8).trim();
      if (!feat.startsWith('-')) {
        result.features.push(feat);
      }
      continue;
    }

    // Mixer type
    if (line.startsWith('mixer ')) {
      result.mixerType = line.split(/\s+/)[1];
      continue;
    }

    // Motor mix: mmix <index> <throttle> <roll> <pitch> <yaw>
    if (line.startsWith('mmix ')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 6) {
        result.motors.push({
          index: parseInt(parts[1]),
          throttle: parseFloat(parts[2]),
          roll: parseFloat(parts[3]),
          pitch: parseFloat(parts[4]),
          yaw: parseFloat(parts[5]),
        });
      }
      continue;
    }

    // Servo config: servo <index> <min> <max> <mid> <rate> <forwardChannel>
    if (/^servo\s+\d/.test(line)) {
      const parts = line.split(/\s+/);
      if (parts.length >= 7) {
        result.servos.push({
          index: parseInt(parts[1]),
          min: parseInt(parts[2]),
          max: parseInt(parts[3]),
          mid: parseInt(parts[4]),
          rate: parseInt(parts[5]),
          forwardChannel: parseInt(parts[6]),
        });
      }
      continue;
    }

    // Servo mix: smix <index> <servo> <source> <rate> <speed> <min> <max> <box>
    if (line.startsWith('smix ')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 9) {
        result.servoMix.push({
          index: parseInt(parts[1]),
          servo: parseInt(parts[2]),
          source: parseInt(parts[3]),
          rate: parseInt(parts[4]),
          speed: parseInt(parts[5]),
          min: parseInt(parts[6]),
          max: parseInt(parts[7]),
          box: parseInt(parts[8]),
        });
      }
      continue;
    }

    // Serial: serial <uart> <funcMask> <mspBaud> <gpsBaud> <telBaud> <bbBaud>
    if (line.startsWith('serial ')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 7) {
        result.serial.push({
          uart: parts[1],
          functionMask: parseInt(parts[2]),
          mspBaud: parseInt(parts[3]),
          gpsBaud: parseInt(parts[4]),
          telBaud: parseInt(parts[5]),
          bbBaud: parseInt(parts[6]),
        });
      }
      continue;
    }

    // Resource: resource <type> <index> <pin>
    if (line.startsWith('resource ')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 4) {
        result.resources.push({
          type: parts[1],
          index: parseInt(parts[2]),
          pin: parts[3],
        });
      }
      continue;
    }

    // Set commands
    if (line.startsWith('set ')) {
      const match = line.match(/^set\s+(\S+)\s*=\s*(.+)$/);
      if (match) {
        const key = match[1];
        const rawValue = match[2].trim();
        // Parse value: try number, keep string otherwise
        let value;
        if (rawValue === 'ON') value = 'ON';
        else if (rawValue === 'OFF') value = 'OFF';
        else if (rawValue.includes('.')) value = parseFloat(rawValue);
        else if (/^-?\d+$/.test(rawValue)) value = parseInt(rawValue);
        else value = rawValue;

        if (currentContext === 'master') {
          result.master[key] = value;
        } else if (currentContext.startsWith('profile:')) {
          const num = parseInt(currentContext.split(':')[1]);
          result.profiles[num][key] = value;
        } else if (currentContext.startsWith('rateprofile:')) {
          const num = parseInt(currentContext.split(':')[1]);
          result.rateProfiles[num][key] = value;
        }
      }
      continue;
    }

    // Pass-through sections
    if (line.startsWith('aux ')) { result.aux.push(line); continue; }
    if (line.startsWith('map ')) { result.map = line; continue; }
    if (line.startsWith('rxrange ')) { result.rxrange.push(line); continue; }
    if (line.startsWith('beacon ')) { result.beacon.push(line); continue; }

    // Batch start/end and resets — skip
    if (line.startsWith('batch ') || line === 'mmix reset' || line === 'smix reset') continue;
  }

  return result;
}
