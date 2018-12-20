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

export enum State {
  On = 1,
  Off = 0,
}


// Registers
export enum Registers {
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
    await pwm.writeByte(Registers.MODE2, BitsMode2.OUTDRV);
    await pwm.writeByte(Registers.MODE1, BitsMode1.ALLCALL);
    await wait(5);

    let mode1 = await pwm.readByte(Registers.MODE1);
    mode1 &= ~BitsMode1.SLEEP; // wake up(reset sleep)
    await pwm.writeByte(Registers.MODE1, mode1);
    await wait(5);

    const freq = await pwm.getFrequency();
    console.log(`frequency is ${freq}Hz`);
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
    return this.sendByte(Registers.MODE1, Commands.SWRST);
  }

  async setFrequency(freq: number): Promise<number> {
    const scaled = PWM.scaleFreqForWrite(freq);
    const oldmode = await this.readByte(Registers.MODE1);
    const newmode = (oldmode & 0x7F) | 0x10; // sleep
    await this.writeByte(Registers.MODE1, newmode); // go to sleep
    await this.writeByte(Registers.PRESCALE, scaled);
    await this.writeByte(Registers.MODE1, oldmode);
    wait(5);
    await this.writeByte(Registers.MODE1, oldmode | 0x80);
    return scaled;
  }

  async setPin(
    @IsValidChannel channel: number,
    state: State
  ) {
    if (state === State.On) await this.writeChannel(channel, 4096, 0);
    else await this.writeChannel(channel, 0, 4096);
  }

  async getFrequency(): Promise<number> {
    const unscaled = await this.readByte(Registers.PRESCALE);
    return PWM.scaleFreqFromRead(unscaled);
  }

  async writeChannel(
    @IsValidChannel channel: number,
    @IsValidChannelValue on: number,
    @IsValidChannelValue off: number
  ): Promise<void> {
    // Sets a single PWM channel
    const offset = 4 * channel;
    await this.writeByte(Registers.LED0_ON_L + offset, on & 0xFF);
    await this.writeByte(Registers.LED0_ON_H + offset, on >> 8);
    await this.writeByte(Registers.LED0_OFF_L + offset, off & 0xFF);
    await this.writeByte(Registers.LED0_OFF_H + offset, off >> 8);
  }

  async writeAllChannels(
    @IsValidChannelValue on: number,
    @IsValidChannelValue off: number
  ): Promise<this> {
    // Sets all PWM channels
    await this.writeByte(Registers.ALL_LED_ON_L, on & 0xFF);
    await this.writeByte(Registers.ALL_LED_ON_H, on >> 8);
    await this.writeByte(Registers.ALL_LED_OFF_L, off & 0xFF);
    await this.writeByte(Registers.ALL_LED_OFF_H, off >> 8);
    return this;
  }

}
