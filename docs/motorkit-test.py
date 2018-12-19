from adafruit_motorkit import MotorKit
from adafruit_motor import stepper
kit = MotorKit()

for i in range(200 * 2):
  kit.stepper1.onestep(direction=stepper.FORWARD, style=stepper.SINGLE)

for i in range(200 * 2):
  kit.stepper1.onestep(direction=stepper.BACKWARD, style=stepper.SINGLE)
