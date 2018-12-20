import * as i2c from 'i2c-bus';
import { wait } from './utils';
import { Validate } from './parameter-validation';

export enum Commands {
  SWRST = 0x00,
}

export enum PCA9685 {
  Channels = 16,
  ChannelMin = 0x000,
  ChannelMax = 0xfff,
}


// Registers
export enum Regs {
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

const IsValidChannel = Validate<number>(x => typeof x === 'number', x => x < PCA9685.Channels, x => x >= 0);
const IsValidChannelValue = Validate<number>(x => typeof x === 'number', x => x <= PCA9685.ChannelMax, x => x >= PCA9685.ChannelMin);


export class PWM {
  static scaleFreqForWrite(freq: number) {
    return Math.round((25e6 / (0xfff * freq)) - 1);
  }

  static scaleFreqFromRead(f: number) {
    return 25000000 / ((f + 1) * 4096);
  }

  static async create(
    address = 0x60,
    busNum = 1
  ): Promise<PWM> {
    const bus = await new Promise<i2c.I2cBus>((ok, err) => {
      const i2cBus = i2c.open(busNum, error => !!error ? err(error) : ok(i2cBus));
    });
    const pwm = new PWM(address, bus);
    await pwm.writeAllChannels(0, 0);
    await pwm.writeByte(Regs.MODE2, BitsMode2.OUTDRV);
    await pwm.writeByte(Regs.MODE1, BitsMode1.ALLCALL);
    await wait(5);

    let mode1 = await pwm.readByte(Regs.MODE1);
    mode1 &= ~BitsMode1.SLEEP; // wake up(reset sleep)
    await pwm.writeByte(Regs.MODE1, mode1);
    await wait(5);

    const freq = await pwm.getFrequency();
    console.log(`frequency is ${freq}Hz`);
    console.log('PWM is ready');
    return pwm;
  }

  private constructor(
    readonly address = 0x60,
    private readonly bus: i2c.I2cBus
  ) {}

  writeByte(command: number, byte: number): Promise<void> {
    return new Promise((ok, err) =>
      this.bus.writeByte(this.address, command, byte, error => !!error ? err(error) : ok())
    );
  }

  sendByte(command: number, byte: number): Promise<void> {
    return new Promise((ok, err) =>
      this.bus.sendByte(this.address, command, error => !!error ? err(error) : ok())
    );
  }

  readByte(command: number): Promise<number> {
    return new Promise((ok, err) =>
      this.bus.readByte(this.address, command, (error, value) => !!error ? err(error) : ok(value))
    );
  }

  async reset() {
    return this.sendByte(Regs.MODE1, Commands.SWRST);
  }

  async setFrequency(freq: number): Promise<number> {
    console.log('Setting PWM frequency to %d Hz', freq);
    const scaled = PWM.scaleFreqForWrite(freq);
    console.log(`Pre-scale value: ${scaled}`);

    const oldmode = await this.readByte(Regs.MODE1);
    const newmode = (oldmode & 0x7F) | 0x10; // sleep
    await this.writeByte(Regs.MODE1, newmode); // go to sleep
    await this.writeByte(Regs.PRESCALE, scaled);
    await this.writeByte(Regs.MODE1, oldmode);
    wait(5);
    await this.writeByte(Regs.MODE1, oldmode | 0x80);
    return scaled;
  }

  async getFrequency(): Promise<number> {
    const unscaled = await this.readByte(Regs.PRESCALE);
    return PWM.scaleFreqFromRead(unscaled);
  }

  async writeChannel(
    @IsValidChannel channel: number,
    @IsValidChannelValue on: number,
    @IsValidChannelValue off: number
  ): Promise<void> {
    // Sets a single PWM channel
    const offset = 4 * channel;
    await this.writeByte(Regs.LED0_ON_L + offset, on & 0xFF);
    await this.writeByte(Regs.LED0_ON_H + offset, on >> 8);
    await this.writeByte(Regs.LED0_OFF_L + offset, off & 0xFF);
    await this.writeByte(Regs.LED0_OFF_H + offset, off >> 8);
  }

  async writeAllChannels(
    @IsValidChannelValue on: number,
    @IsValidChannelValue off: number
  ): Promise<this> {
    // Sets all PWM channels
    await this.writeByte(Regs.ALL_LED_ON_L, on & 0xFF);
    await this.writeByte(Regs.ALL_LED_ON_H, on >> 8);
    await this.writeByte(Regs.ALL_LED_OFF_L, off & 0xFF);
    await this.writeByte(Regs.ALL_LED_OFF_H, off >> 8);
    return this;
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
