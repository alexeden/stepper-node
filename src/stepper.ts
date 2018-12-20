import { PWM } from './pwm';
import { Pins } from './pins';

export enum Direction {
  Forward = 'fwd',
  Backward = 'back',
}

interface State {
  PWMA: number;
  PWMB: number;
  AIN2: number;
  BIN1: number;
  AIN1: number;
  BIN2: number;
}

const NS_PER_MS = 1e6;

export class Stepper {
  pps = 1000; // pulses per second
  currentStep = 0;
  microsteps: 8 | 16 = 16;
  current = 1;
  pulsing = false;
  state: Partial<State> = {};

  static nowInMillis() {
    const [s, ns] = process.hrtime();
    return (s * 1000) + (ns / NS_PER_MS);
  }

  static readonly step2coils = [
    [1, 0, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 1],
    [0, 0, 0, 1],
    [1, 0, 0, 1],
  ];

  constructor(
    readonly pwm: PWM,
    readonly w1 = Pins.M1,
    readonly w2 = Pins.M2,
    readonly stepsPerRev = 200
  ) {}

  async lazyPWM<K extends keyof State>(pin: K, newState: State[K]) {
    // Decrement the maximum duty cycle by the rate passed in current
    const throttledState = newState * this.current;
    if (this.state[pin] === undefined || this.state[pin] !== throttledState) {
      await this.pwm.writeChannel(this.getPinNumber(pin), 0, throttledState);
      this.state[pin] = throttledState;
    }
  }

  async lazyPin<K extends keyof State>(pin: K, newState: State[K]) {
    if (this.state[pin] === undefined || this.state[pin] !== newState) {
      await this.pwm.setPin(this.getPinNumber(pin), newState);
      this.state[pin] = newState;
    }
  }

  getPinNumber(key: keyof State): number {
    switch (key) {
      case 'PWMA': return this.w1.PWM;
      case 'AIN2': return this.w1.IN2;
      case 'AIN1': return this.w1.IN1;
      case 'PWMB': return this.w2.PWM;
      case 'BIN2': return this.w2.IN2;
      case 'BIN1': return this.w2.IN1;
    }
  }

  // tslint:disable-next-line:ban-types
  async pulse(newState: State) {
    this.pulsing = true;
    await this.lazyPWM('PWMA', newState.PWMA);
    await this.lazyPWM('PWMB', newState.PWMB);
    await this.lazyPin('AIN2', newState.AIN2);
    await this.lazyPin('BIN1', newState.BIN1);
    await this.lazyPin('AIN1', newState.AIN1);
    await this.lazyPin('BIN2', newState.BIN2);
    this.pulsing = false;
  }

  async step(dir: Direction, steps: number) {
    return new Promise((ok, fail) => {

      const wait = (1 / this.pps) * 1000;

      let count = 0;
      let retried = 0;
      let now = Stepper.nowInMillis();
      // const startTime = (new Date()).getTime();
      const startTime = now;
      const run = async () => {
        now = Stepper.nowInMillis();
        if (count >= steps) {
          clearInterval(timer);
          ok({
            steps: count,
            dir,
            duration: Stepper.nowInMillis() - startTime,
            retried,
          });
          return;
        }
        if (this.pulsing) {
          console.log('STEPPER: max speed reached, trying to send pulse while previous not finished');
          retried += 1;
          // cb('STEPPER: max speed reached, trying to send pulse while previous not finished');
          // clearInterval(timer);
          return;
        }
        const newState = this.single(dir);
        await this.pulse(newState);
        count += 1;
        const remaining = wait - (Stepper.nowInMillis() - now);
        console.log(`STEPPER: Waiting ${remaining} ms until next step`);
        now = Stepper.nowInMillis();

      };
      const timer = setInterval(run, wait);
    });
  }

  single(dir: Direction): State {
    const microsteps = this.microsteps;
    const pwmA = 255;
    const pwmB = 255;

    // go to next even half step
    if (dir === Direction.Forward) {
      this.currentStep += microsteps;
    }
    else {
      this.currentStep -= microsteps;
    }

    // for single stepping, we only use the even halfsteps, floor to next even halfstep if necesary
    this.currentStep -= (this.currentStep % microsteps);

    // go to next 'step' and wrap around
    this.currentStep += microsteps * 4;
    this.currentStep %= microsteps * 4;

    // set up coils
    const coils = Stepper.step2coils[Math.floor(this.currentStep / (microsteps / 2))];

    console.log(`SINGLE STEPPING: Coils state = ${coils}`);

    return {
      PWMA: pwmA * 16,
      PWMB: pwmB * 16,
      AIN2: coils[0],
      BIN1: coils[1],
      AIN1: coils[2],
      BIN2: coils[3],
    };
  }
}
