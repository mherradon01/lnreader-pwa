// Web shim for react-native-reanimated Easing
// Provides easing functions for web builds

function linear(t) {
  return t;
}

function ease(t) {
  return bezierFn(0.42, 0, 1, 1)(t);
}

function quad(t) {
  return t * t;
}

function cubic(t) {
  return t * t * t;
}

function poly(n) {
  return (t) => Math.pow(t, n);
}

function sin(t) {
  return 1 - Math.cos((t * Math.PI) / 2);
}

function circle(t) {
  return 1 - Math.sqrt(1 - t * t);
}

function exp(t) {
  return Math.pow(2, 10 * (t - 1));
}

function elastic(bounciness = 1) {
  const p = bounciness * Math.PI;
  return (t) => 1 - Math.pow(Math.cos((t * Math.PI) / 2), 3) * Math.cos(t * p);
}

function back(s = 1.70158) {
  return (t) => t * t * ((s + 1) * t - s);
}

function bounce(t) {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  }
  if (t < 2 / 2.75) {
    const t2 = t - 1.5 / 2.75;
    return 7.5625 * t2 * t2 + 0.75;
  }
  if (t < 2.5 / 2.75) {
    const t2 = t - 2.25 / 2.75;
    return 7.5625 * t2 * t2 + 0.9375;
  }
  const t2 = t - 2.625 / 2.75;
  return 7.5625 * t2 * t2 + 0.984375;
}

// Attempt to get actual bezier function from reanimated, fallback to simple implementation
function bezierFn(x1, y1, x2, y2) {
  // Simple cubic bezier implementation
  const NEWTON_ITERATIONS = 4;
  const NEWTON_MIN_SLOPE = 0.001;
  const SUBDIVISION_PRECISION = 0.0000001;
  const SUBDIVISION_MAX_ITERATIONS = 10;
  const kSplineTableSize = 11;
  const kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

  function A(aA1, aA2) {
    return 1.0 - 3.0 * aA2 + 3.0 * aA1;
  }
  function B(aA1, aA2) {
    return 3.0 * aA2 - 6.0 * aA1;
  }
  function C(aA1) {
    return 3.0 * aA1;
  }
  function calcBezier(aT, aA1, aA2) {
    return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
  }
  function getSlope(aT, aA1, aA2) {
    return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
  }

  if (x1 === y1 && x2 === y2) {
    return (x) => x;
  }

  const sampleValues = new Array(kSplineTableSize);
  for (let i = 0; i < kSplineTableSize; ++i) {
    sampleValues[i] = calcBezier(i * kSampleStepSize, x1, x2);
  }

  function getTForX(aX) {
    let intervalStart = 0.0;
    let currentSample = 1;
    const lastSample = kSplineTableSize - 1;

    for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
      intervalStart += kSampleStepSize;
    }
    --currentSample;

    const dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    const guessForT = intervalStart + dist * kSampleStepSize;
    const initialSlope = getSlope(guessForT, x1, x2);

    if (initialSlope >= NEWTON_MIN_SLOPE) {
      let aGuessT = guessForT;
      for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
        const currentSlope = getSlope(aGuessT, x1, x2);
        if (currentSlope === 0.0) break;
        const currentX = calcBezier(aGuessT, x1, x2) - aX;
        aGuessT -= currentX / currentSlope;
      }
      return aGuessT;
    } else if (initialSlope === 0.0) {
      return guessForT;
    } else {
      let aA = intervalStart;
      let aB = intervalStart + kSampleStepSize;
      let currentX, currentT, i = 0;
      do {
        currentT = aA + (aB - aA) / 2.0;
        currentX = calcBezier(currentT, x1, x2) - aX;
        if (currentX > 0.0) {
          aB = currentT;
        } else {
          aA = currentT;
        }
      } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
      return currentT;
    }
  }

  return function (x) {
    if (x === 0) return 0;
    if (x === 1) return 1;
    return calcBezier(getTForX(x), y1, y2);
  };
}

function bezier(x1, y1, x2, y2) {
  return {
    factory: () => bezierFn(x1, y1, x2, y2),
  };
}

function steps(n = 10, roundToNextStep = true) {
  return (t) => {
    const value = Math.min(Math.max(t, 0), 1) * n;
    if (roundToNextStep) {
      return Math.ceil(value) / n;
    }
    return Math.floor(value) / n;
  };
}

function in_(easing) {
  return easing;
}

function out(easing) {
  return (t) => 1 - easing(1 - t);
}

function inOut(easing) {
  return (t) => {
    if (t < 0.5) {
      return easing(t * 2) / 2;
    }
    return 1 - easing((1 - t) * 2) / 2;
  };
}

export const Easing = {
  linear,
  ease,
  quad,
  cubic,
  poly,
  sin,
  circle,
  exp,
  elastic,
  back,
  bounce,
  bezier,
  bezierFn,
  steps,
  in: in_,
  out,
  inOut,
};

// Symbol used by reanimated to identify easing functions by name
export const EasingNameSymbol = Symbol('easingName');

// Add the symbol to each easing function
for (const [easingName, easing] of Object.entries(Easing)) {
  if (typeof easing === 'function') {
    Object.defineProperty(easing, EasingNameSymbol, {
      value: easingName,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  }
}

export default Easing;
