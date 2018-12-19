// import { getPins } from 'raspi-board';
import * as i2c from 'i2c-bus';

const bus = i2c.openSync(1);
console.log(bus.scanSync());

// console.log('Pins: ', JSON.stringify(getPins(), null, 2));
