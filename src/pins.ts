export interface Pin {
  PWM: number;
  IN2: number;
  IN1: number;
}

export class Pins {
  static readonly M1: Pin = {
    PWM: 8,
    IN2: 9,
    IN1: 10,
  };

  static readonly M2: Pin = {
    PWM: 13,
    IN2: 12,
    IN1: 11,
  };

  static readonly M3: Pin = {
    PWM: 2,
    IN2: 3,
    IN1: 4,
  };

  static readonly M4: Pin = {
    PWM: 7,
    IN2: 6,
    IN1: 5,
  };
}
