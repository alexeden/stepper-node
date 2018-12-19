I want to verify that my wiring is correct before writing a whole new library. To do that, I'll be using CircuitPython and various instructions from Adafruit to get a test script up and running.

This file will serve as a TL;DR of my steps and missteps, should I ever need to do this again.

- SSH into the device

- Get pip: `sudo apt install python3-pip`

- Install this: `pip3 install --upgrade setuptools`

- This: `pip3 install RPI.GPIO`

- And this: `pip3 install adafruit-blinka`

[Above steps come from here.](https://learn.adafruit.com/circuitpython-on-raspberrypi-linux/installing-circuitpython-on-raspberry-pi)

- Now install `MotorKit`: `pip3 install adafruit-circuitpython-motorkit`

- Finally, test it: `python3 docs/motorkit-test.py`

[Resource for the above steps.](https://learn.adafruit.com/adafruit-dc-and-stepper-motor-hat-for-raspberry-pi/using-stepper-motors)
