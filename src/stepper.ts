import { PWM, State, PCA9685 } from './pwm';
import { Pins } from './pins';

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

const NS_PER_MS = 1e6;

export class Stepper {
  pps = 100; // pulses per second
  currentStep = 0;
  microsteps: 8 | 16 = 8;
  current = 1;
  pulsing = false;

  static nowInMillis() {
    const [s, ns] = process.hrtime();
    return (s * 1000) + (ns / NS_PER_MS);
  }

  static readonly step2coils: CoilState[] = [
    [State.On,  State.Off,  State.Off,  State.Off],
    [State.On,  State.On,   State.Off,  State.Off],
    [State.Off, State.On,   State.Off,  State.Off],
    [State.Off, State.On,   State.On,   State.Off],
    [State.Off, State.Off,  State.On,   State.Off],
    [State.Off, State.Off,  State.On,   State.On],
    [State.Off, State.Off,  State.Off,  State.On],
    [State.On,  State.Off,  State.Off,  State.On],
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

  // async lazyPin<K extends keyof PinState>(pin: K, newState: PinState[K]) {
  //   if (this.state[pin] === undefined || this.state[pin] !== newState) {
  //     await this.pwm.setPin(this.getPinNumber(pin), newState);
  //     this.state[pin] = newState;
  //   }
  // }

  // getPinNumber(key: keyof PinState): number {
  //   switch (key) {
  //     case 'AIN2': return this.w1.IN2;
  //     case 'AIN1': return this.w1.IN1;
  //     case 'BIN2': return this.w2.IN2;
  //     case 'BIN1': return this.w2.IN1;
  //   }
  // }

  // tslint:disable-next-line:ban-types
  async updateCoils([w1in2, w2in1, w1in1, w2in2]: CoilState) {
    this.pulsing = true;
    await this.pwm.setPin(this.w1.IN2, w1in2);
    await this.pwm.setPin(this.w2.IN1, w2in1);
    await this.pwm.setPin(this.w1.IN1, w1in1);
    await this.pwm.setPin(this.w2.IN2, w2in2);

    // await this.lazyPin('AIN2', newState.AIN2);
    // await this.lazyPin('BIN1', newState.BIN1);
    // await this.lazyPin('AIN1', newState.AIN1);
    // await this.lazyPin('BIN2', newState.BIN2);
    this.pulsing = false;
  }

  async idle() {
    console.log('detaching motor');
    await this.updateCoils([0, 0, 0, 0]);
    console.log('should be detached');
  }

  async step(dir: Direction, steps: number) {
    return new Promise(ok => {
      let count = 0;
      let retried = 0;
      let now = Stepper.nowInMillis();
      const startTime = now;
      const run = async () => {
        now = Stepper.nowInMillis();
        if (count >= steps) {
          clearInterval(timer);
          const duration = Stepper.nowInMillis() - startTime;
          ok({ steps: count, dir, duration, retried });
          return;
        }
        if (this.pulsing) {
          console.log('STEPPER: max speed reached, trying to send updateCoils while previous not finished');
          retried += 1;
          return;
        }
        const newState = this.getNextState(dir);
        await this.updateCoils(newState);
        count += 1;
        now = Stepper.nowInMillis();
      };
      // const remaining = wait - (Stepper.nowInMillis() - now);
      // console.log(`STEPPER: Waiting ${remaining} ms until next step`);
      const interval = (1 / this.pps) * 1000;
      const timer = setInterval(run, interval);
    });
  }

  private getNextState(dir: Direction): CoilState {
    const microsteps = this.microsteps;

    // go to next even half step
    this.currentStep += microsteps * (dir === Direction.Forward ? 1 : -1);
    // for next stepping, we only use the even halfsteps, floor to next even halfstep if necesary
    this.currentStep -= (this.currentStep % microsteps);
    // go to next 'step' and wrap around
    this.currentStep += microsteps * 4;
    this.currentStep %= microsteps * 4;

    // set up coils
    // const coils =
    return Stepper.step2coils[Math.floor(this.currentStep / (microsteps / 2))];

    // console.log(`SINGLE STEPPING: Coils state = ${coils}, current step: ${this.currentStep}`);

    // return {
    //   // PWMA: 0xFFF,
    //   // PWMB: 0xFFF,
    //   AIN2: coils[0],
    //   BIN1: coils[1],
    //   AIN1: coils[2],
    //   BIN2: coils[3],
    // };
  }
}
