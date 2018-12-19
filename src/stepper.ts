import { PWM } from 'pwm';
import { Pins } from 'pins';

export enum Direction {
  Forward = 'fwd',
  Backward = 'back',
}


export class Stepper {
  constructor(
    readonly pwm: PWM,
    readonly w1 = Pins.M1,
    readonly w2 = Pins.M2
  ) {}
}
