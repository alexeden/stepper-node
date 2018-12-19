import { getPins } from 'raspi-board';

console.log('Pins: ', JSON.stringify(getPins(), null, 2));
