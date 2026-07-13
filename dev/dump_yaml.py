import irsdk
import yaml
import json

ibt = irsdk.IBT()
ibt.open('dev/telemetry.ibt')

start = ibt._header.session_info_offset
length = ibt._header.session_info_len
end = start + length

yaml_str = ibt._shared_mem[start:end].rstrip(b'\x00').decode('utf-8', errors='ignore')

with open('dev/session_info.yaml', 'w') as f:
    f.write(yaml_str)

ibt.close()
