import irsdk
import time


ir = irsdk.IRSDK()
ir.startup()

try:
    while True:
        speed = ir['Speed']
        rpm = ir['RPM']
        gear = ir['Gear']

        print(f"Speed: {speed}")
        print(f"RPM: {rpm}")
        print(f"Gear: {gear}")
        print()

        time.sleep(1)

except KeyboardInterrupt:
    print("Exiting...")
    ir.shutdown()
