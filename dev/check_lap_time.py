import irsdk

ibt = irsdk.IBT()
ibt.open('dev/telemetry.ibt')

names = ibt.var_headers_names
if 'LapCurrentLapTime' in names:
    times = ibt.get_all('LapCurrentLapTime')
    print("First 10 times:", times[:10])
    print("Max time:", max(times) if times else "Empty")
else:
    print("LapCurrentLapTime not found!")
    print("Available Lap related vars:", [n for n in names if 'lap' in n.lower()])

ibt.close()
