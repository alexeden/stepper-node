import { PWM, State, PCA9685 } from './pwm';
import { Pins } from './pins';
import { wait } from './utils';
// import { clampLoop } from './utils';

export enum Direction {
  Forward = 'fwd',
  Backward = 'back',
}

// interface PinState {
//   // PWMA: number;
//   // PWMB: number;
//   AIN2: State;
//   BIN1: State;
//   AIN1: State;
//   BIN2: State;
// }

type CoilState = [State, State, State, State];

interface StepResult {
  steps: number;
  dir: Direction;
  duration: number;
}

const NS_PER_MS = 1e6;

export class Stepper {
  pps = 1000; // pulses per second
  currentStep = 0;
  // microsteps: 8 | 16 = 8;
  microsteps = 2;
  current = 1;
  pulsing = false;

  static nowInMillis() {
    const [s, ns] = process.hrtime();
    return (s * 1000) + (ns / NS_PER_MS);
  }

  static readonly doubleCoilSteps: CoilState[] = [
    [State.On,  State.Off,  State.Off,  State.Off],
    [State.On,  State.On,   State.Off,  State.Off],
    [State.Off, State.On,   State.Off,  State.Off],
    [State.Off, State.On,   State.On,   State.Off],
    [State.Off, State.Off,  State.On,   State.Off],
    [State.Off, State.Off,  State.On,   State.On],
    [State.Off, State.Off,  State.Off,  State.On],
    [State.On,  State.Off,  State.Off,  State.On],
  ];

  static readonly singleCoilSteps: CoilState[] = [
    [State.On,  State.Off,  State.Off,  State.Off],
    [State.Off, State.On,   State.Off,  State.Off],
    [State.Off, State.Off,  State.On,   State.Off],
    [State.Off, State.Off,  State.Off,  State.On],
  ];

  constructor(
    readonly pwm: PWM,
    readonly w1 = Pins.M1,
    readonly w2 = Pins.M2,
    readonly stepsPerRev = 200
  ) {}

  async setStrength(strength = 1) {
    const pwmValue = Math.floor(strength * PCA9685.ChannelMax);
    await this.pwm.writeChannel(this.w1.PWM, 0, pwmValue);
    await this.pwm.writeChannel(this.w2.PWM, 0, pwmValue);
    return pwmValue;
  }

  async updateCoils([w1in2, w2in1, w1in1, w2in2]: CoilState) {
    this.pulsing = true;
    await this.pwm.setPin(this.w1.IN2, w1in2);
    await this.pwm.setPin(this.w2.IN1, w2in1);
    await this.pwm.setPin(this.w1.IN1, w1in1);
    await this.pwm.setPin(this.w2.IN2, w2in2);
    this.pulsing = false;
  }

  async idle() {
    console.log('detaching motor');
    await this.updateCoils([0, 0, 0, 0]);
    console.log('should be detached');
  }

  async step(dir: Direction, steps: number) {
    const startTime = Stepper.nowInMillis();
    const interval = (1 / this.pps) * 1000;
    console.log(`interval is ${interval}ms`);
    const run = async (count: number): Promise<StepResult> => {
      if (count >= steps) {
        const duration = Stepper.nowInMillis() - startTime;
        return { steps, dir, duration };
      }
      const stepStartTime = Stepper.nowInMillis();
      this.currentStep = this.getNextStepIndex(dir, Stepper.singleCoilSteps.length);
      const newState = Stepper.singleCoilSteps[this.currentStep];
      await this.updateCoils(newState);
      const stepDuration = Stepper.nowInMillis() - stepStartTime;
      if (stepDuration < interval) {
        await wait(Math.floor(interval - stepDuration));
      }
      return run(count + 1);
    };
    return run(0);
  }

  private getNextStepIndex(dir: Direction, steps: number): number {
    if (dir === Direction.Forward) {
      return (this.currentStep + 1) % steps;
    }
    else {
      const next = this.currentStep - 1;
      return next + (next < 0 ? steps : 0);
    }
  }
}
