import * as i2c from 'i2c-bus';
import { sleep } from './utils';

export enum Commands {
  SWRST = 0x00,
}

// Registers
export enum Reg {
  MODE1          = 0x00,
  MODE2          = 0x01,
  SUBADR1        = 0x02,
  SUBADR2        = 0x03,
  SUBADR3        = 0x04,
  SWRST          = 0x06,
  PRESCALE       = 0xFE,
  LED0_ON_L      = 0x06,
  LED0_ON_H      = 0x07,
  LED0_OFF_L     = 0x08,
  LED0_OFF_H     = 0x09,
  ALL_LED_ON_L   = 0xFA,
  ALL_LED_ON_H   = 0xFB,
  ALL_LED_OFF_L  = 0xFC,
  ALL_LED_OFF_H  = 0xFD,
}

// Bits
export enum BitsMode1 {
  RESTART       = (1 << 7),
  EXTCLK        = (1 << 6),
  AUTOINC       = (1 << 5),
  SLEEP         = (1 << 4),
  SUB1          = (1 << 3),
  SUB2          = (1 << 2),
  SUB3          = (1 << 1),
  ALLCALL       = (1 << 0),
}

export enum BitsMode2 {
  INVRT         = (1 << 4),
  OUTCHG        = (1 << 3),
  // OUTDRV        = (1 << 2),
  OUTDRV        = 0x04,
}


export class PWM {
  // Helper method to get a device at the specified address from the I2C bus.
  // If no i2c bus is specified (i2c param is None) then the default I2C bus
  // for the platform will be used.
  // static getI2cDevice(address: number, i2c: I2cBus) {
  //   return i2c.
  // }

  private readonly bus: i2c.I2cBus;

  constructor(
    readonly address = 0x60,
    readonly busNum = 1
  ) {
    console.log(`Opening bus number ${this.busNum}`);
    this.bus = i2c.openSync(this.busNum);
    console.log(`Bus open`);
    this.setAllChannels(0, 0);
    console.log(`All channels set`);
    this.bus.writeByteSync(this.address, Reg.MODE2, BitsMode2.OUTDRV);
    console.log(`${BitsMode2[BitsMode2.OUTDRV]} bit of ${Reg[Reg.MODE2]} set`);
    this.bus.writeByteSync(this.address, Reg.MODE1, BitsMode1.ALLCALL);
    console.log(`${BitsMode1[BitsMode1.ALLCALL]} bit of ${Reg[Reg.MODE1]} set`);

    sleep(5);

    let mode1 = this.bus.readByteSync(this.address, Reg.MODE1);
    mode1 &= ~BitsMode1.SLEEP; // wake up(reset sleep)

    this.bus.writeByteSync(this.address, Reg.MODE1, mode1);
    sleep(5);

  }

  reset() {
    this.bus.writeByteSync(this.address, Reg.MODE1, Commands.SWRST);
  }

  setAllChannels(on: number, off: number) {
    // Sets a all PWM channels
    this.bus.writeByteSync(this.address, Reg.ALL_LED_ON_L, on & 0xFF);
    this.bus.writeByteSync(this.address, Reg.ALL_LED_ON_H, on >> 8);
    this.bus.writeByteSync(this.address, Reg.ALL_LED_OFF_L, off & 0xFF);
    this.bus.writeByteSync(this.address, Reg.ALL_LED_OFF_H, off >> 8);
  }

}

/*
class PWM(object):

    @classmethod
    def softwareReset(cls, i2c=None, i2c_bus=None):
        "Sends a software reset (SWRST) command to all the servo drivers on the bus"
        general_call_i2c = get_i2c_device(0x00, i2c, i2c_bus)
        general_call_i2c.writeRaw8(0x06)        // SWRST

    def __init__(self, address=0x40, debug=False, i2c=None, i2c_bus=None):
        self.i2c = get_i2c_device(address, i2c, i2c_bus)
        logger.debug("Reseting PCA9685 MODE1 (without SLEEP) and MODE2")
        self.setAllPWM(0, 0)
        self.i2c.write8(self.__MODE2, self.__OUTDRV)
        self.i2c.write8(self.__MODE1, self.__ALLCALL)
        time.sleep(0.005)                             // wait for oscillator
        mode1 = self.i2c.readU8(self.__MODE1)
        mode1 = mode1 & ~self.__SLEEP                 // wake up (reset sleep)
        self.i2c.write8(self.__MODE1, mode1)
        time.sleep(0.005)                             // wait for oscillator

    def setPWMFreq(self, freq):
        "Sets the PWM frequency"
        prescaleval = 25000000.0    // 25MHz
        prescaleval /= 4096.0       // 12-bit
        prescaleval /= float(freq)
        prescaleval -= 1.0
        logger.debug("Setting PWM frequency to %d Hz" % freq)
        logger.debug("Estimated pre-scale: %d" % prescaleval)
        prescale = math.floor(prescaleval + 0.5)
        logger.debug("Final pre-scale: %d" % prescale)
        oldmode = self.i2c.readU8(self.__MODE1);
        newmode = (oldmode & 0x7F) | 0x10             // sleep
        self.i2c.write8(self.__MODE1, newmode)        // go to sleep
        self.i2c.write8(self.__PRESCALE, int(math.floor(prescale)))
        self.i2c.write8(self.__MODE1, oldmode)
        time.sleep(0.005)
        self.i2c.write8(self.__MODE1, oldmode | 0x80)

    def setPWM(self, channel, on, off):
        "Sets a single PWM channel"
        self.i2c.write8(self.__LED0_ON_L+4*channel, on & 0xFF)
        self.i2c.write8(self.__LED0_ON_H+4*channel, on >> 8)
        self.i2c.write8(self.__LED0_OFF_L+4*channel, off & 0xFF)
        self.i2c.write8(self.__LED0_OFF_H+4*channel, off >> 8)

    def setAllPWM(self, on, off):
        "Sets a all PWM channels"
        self.i2c.write8(self.__ALL_LED_ON_L, on & 0xFF)
        self.i2c.write8(self.__ALL_LED_ON_H, on >> 8)
        self.i2c.write8(self.__ALL_LED_OFF_L, off & 0xFF)
        self.i2c.write8(self.__ALL_LED_OFF_H, off >> 8)
}
*/
