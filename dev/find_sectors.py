import irsdk

ibt = irsdk.IBT()
ibt.open('dev/telemetry.ibt')

names = ibt.var_headers_names
sector_vars = [name for name in names if 'sector' in name.lower() or 'split' in name.lower()]
print("Sector variables:", sector_vars)

ibt.close()
