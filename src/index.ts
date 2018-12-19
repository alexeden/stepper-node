// import { getPins } from 'raspi-board';
import { PWM } from './pwm';
// import * as i2c from 'i2c-bus';

// const bus = i2c.openSync(1);
// console.log(bus.scanSync());
const pwm = new PWM();
console.log(pwm);
// console.log('Pins: ', JSON.stringify(getPins(), null, 2));
