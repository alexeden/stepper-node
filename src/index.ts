// import { getPins } from 'raspi-board';
import { PWM } from './pwm';
import { Stepper, Direction } from './stepper';
// import * as i2c from 'i2c-bus';

// const bus = i2c.openSync(1);
// console.log(bus.scanSync());
(async () => {
  try {
    const pwm = await PWM.create();
    await pwm.setFrequency(1700);
    const freq = await pwm.getFrequency();
    console.log(`pwm frequency is ${freq}Hz`);
    const stepper = new Stepper(pwm);
    console.log(stepper);
    await stepper.setStrength(0.4);
    const fResults = await stepper.step(Direction.Forward, 50);
    console.log('forward fResults: ', fResults);
    const bResults = await stepper.step(Direction.Backward, 50);
    console.log('backward results: ', bResults);

    setTimeout(() => stepper.idle(), 5000);
  }
  catch (error) {
    console.error(error);
  }
})();

// console.log('Pins: ', JSON.stringify(getPins(), null, 2));
