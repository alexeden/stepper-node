// import { getPins } from 'raspi-board';
import { PWM } from './pwm';
import { Stepper } from './stepper';
// import * as i2c from 'i2c-bus';

// const bus = i2c.openSync(1);
// console.log(bus.scanSync());
(async () => {
  try {
    const pwm = await PWM.create();
    const stepper = new Stepper(pwm);
    console.log(stepper);
  }
  catch (error) {
    console.error(error);
  }
})();

// console.log('Pins: ', JSON.stringify(getPins(), null, 2));
