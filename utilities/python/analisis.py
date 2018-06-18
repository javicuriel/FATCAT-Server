import sys
import json
import time
import datetime
import numpy as np

def format_date(rows):
    for row in rows:
        row['timestamp'] = datetime.datetime.strptime(row['timestamp'],'%Y-%m-%dT%H:%M:%S.%fZ')
    return rows

def main(data):
    rows = data['rows']
    # Remove duplicates
    rows = [dict(t) for t in set([tuple(d.items()) for d in rows])]
    # Sort
    rows = sorted(rows, key=lambda k: k['timestamp'])

    t1 = datetime.datetime.strptime(data['timestamp'],'%Y-%m-%dT%H:%M:%S.%fZ')
    t0 = t1 - datetime.timedelta(seconds = 5)
    t2 = t1 + datetime.timedelta(seconds = 630)

    ppmtoug = 12.01/22.4

    rows = format_date(rows)
    baseline_co2 = [];

    flow = [];
    toven = []
    co2 = [];
    runtime = [];
    timestamp = [];

    pco2 = []
    countdown = []


    for row in rows:
        if(row['timestamp'] < t1):
            baseline_co2.append(row['co2'])
            # rows.remove(row)
        else:
            co2.append(row['co2'])
            flow.append(row['flow'])
            toven.append(row['toven'])
            runtime.append(row['runtime']/60)
            pco2.append(row['pco2'])
            countdown.append(row['countdown'])
            timestamp.append(row['timestamp'].isoformat())


    baseline = np.average(baseline_co2)
    flowrate = np.average(flow)
    max_temp = np.max(toven)
    co2 = np.array(co2) - baseline

    deltatc = (co2*ppmtoug)*flowrate
    total_carbon = np.trapz(deltatc, x=np.array(runtime))

    response = {'rows': []}
    response['results'] = {'total_carbon': total_carbon, 'baseline':baseline, 'max_temp':max_temp};


    for i in range(len(deltatc)):
        response['rows'].append({
            'timestamp': timestamp[i],
            'runtime': runtime[i],
            'toven': toven[i],
            'pco2': pco2[i],
            'co2': co2[i] + baseline,
            'flow': flow[i],
            'countdown': countdown[i],
            'co2_minus_baseline': co2[i],
            'deltatc': deltatc[i]
        });

    return response



data = {"timestamp": "2018-06-12T13:48:21.614Z", "rows": [{"tco2": 51.1, "statusbyte": "0A", "co2": 6.7, "tcat": 236.2, "timestamp": "2018-06-12T13:48:16.846135Z", "spcat": 25, "flow": 0.52, "countdown": 0, "spband": 330, "toven": 28.7, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131010.75, "tband": 336, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.7, "tcat": 236.4, "timestamp": "2018-06-12T13:48:17.368249Z", "spcat": 25, "flow": 0.51, "countdown": 0, "spband": 330, "toven": 28.9, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131011, "tband": 336.8, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.7, "tcat": 236.5, "timestamp": "2018-06-12T13:48:17.885714Z", "spcat": 25, "flow": 0.52, "countdown": 0, "spband": 330, "toven": 29.1, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131011.25, "tband": 337.3, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.4, "tcat": 236.6, "timestamp": "2018-06-12T13:48:18.408704Z", "spcat": 25, "flow": 0.51, "countdown": 0, "spband": 330, "toven": 29, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131011.5, "tband": 337.6, "pco2": 90}, {"tco2": 51.1, "statusbyte": "0A", "co2": 6.4, "tcat": 236.4, "timestamp": "2018-06-12T13:48:18.932062Z", "spcat": 25, "flow": 0.52, "countdown": 0, "spband": 330, "toven": 28.7, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131011.75, "tband": 338.1, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.7, "tcat": 236.2, "timestamp": "2018-06-12T13:48:19.454365Z", "spcat": 25, "flow": 0.5, "countdown": 0, "spband": 330, "toven": 28.7, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131012, "tband": 338.1, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.7, "tcat": 236.2, "timestamp": "2018-06-12T13:48:19.977833Z", "spcat": 25, "flow": 0.49, "countdown": 0, "spband": 330, "toven": 28.6, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131012.25, "tband": 338.9, "pco2": 90}, {"tco2": 51.1, "statusbyte": "0A", "co2": 6.4, "tcat": 236.2, "timestamp": "2018-06-12T13:48:20.502363Z", "spcat": 25, "flow": 0.49, "countdown": 0, "spband": 330, "toven": 28.6, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131012.5, "tband": 339.3, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.4, "tcat": 236.3, "timestamp": "2018-06-12T13:48:21.025402Z", "spcat": 25, "flow": 0.51, "countdown": 0, "spband": 330, "toven": 28.8, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131012.75, "tband": 339.7, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.9, "tcat": 236.6, "timestamp": "2018-06-12T13:48:21.548930Z", "spcat": 25, "flow": 0.49, "countdown": 0, "spband": 330, "toven": 29, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131013, "tband": 340.1, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.9, "tcat": 236.6, "timestamp": "2018-06-12T13:48:22.071347Z", "spcat": 25, "flow": 0.49, "countdown": 0, "spband": 330, "toven": 29, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131013.25, "tband": 340.6, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 7, "tcat": 236.5, "timestamp": "2018-06-12T13:48:22.596193Z", "spcat": 25, "flow": 0.51, "countdown": 0, "spband": 330, "toven": 28.9, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131013.5, "tband": 340.8, "pco2": 89.9}, {"tco2": 51.1, "statusbyte": "48", "co2": 7, "tcat": 236.2, "timestamp": "2018-06-12T13:48:23.120945Z", "spcat": 25, "flow": 0.51, "countdown": 0, "spband": 330, "toven": 28.6, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131013.75, "tband": 341, "pco2": 89.9}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.5, "tcat": 236.2, "timestamp": "2018-06-12T13:48:23.643114Z", "spcat": 25, "flow": 0.49, "countdown": 0, "spband": 330, "toven": 28.5, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131014, "tband": 341.4, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.5, "tcat": 236.3, "timestamp": "2018-06-12T13:48:24.166309Z", "spcat": 25, "flow": 0.51, "countdown": 0, "spband": 330, "toven": 28.6, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131014.25, "tband": 341.6, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.9, "tcat": 236.5, "timestamp": "2018-06-12T13:48:24.685313Z", "spcat": 25, "flow": 0.51, "countdown": 0, "spband": 330, "toven": 28.9, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131014.5, "tband": 341.9, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.9, "tcat": 236.4, "timestamp": "2018-06-12T13:48:25.207980Z", "spcat": 25, "flow": 0.49, "countdown": 0, "spband": 330, "toven": 29, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131014.75, "tband": 342.3, "pco2": 90}, {"tco2": 51.1, "statusbyte": "58", "co2": 6.8, "tcat": 236.5, "timestamp": "2018-06-12T13:48:25.730121Z", "spcat": 25, "flow": 0.51, "countdown": 70, "spband": 330, "toven": 28.9, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16.1, "runtime": 131015, "tband": 342.6, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.6, "tcat": 236.3, "timestamp": "2018-06-12T13:49:56.073208Z", "spcat": 25, "flow": 0.49, "countdown": 0, "spband": 330, "toven": 28.6, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131008.5, "tband": 331.9, "pco2": 90}, {"tco2": 51.2, "statusbyte": "0A", "co2": 6.1, "tcat": 236.2, "timestamp": "2018-06-12T13:49:56.595421Z", "spcat": 25, "flow": 0.52, "countdown": 0, "spband": 330, "toven": 28.7, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131008.75, "tband": 332.4, "pco2": 90}, {"tco2": 51.2, "statusbyte": "48", "co2": 6.1, "tcat": 236.3, "timestamp": "2018-06-12T13:49:57.119458Z", "spcat": 25, "flow": 0.5, "countdown": 0, "spband": 330, "toven": 28.6, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131009, "tband": 332.8, "pco2": 90}, {"tco2": 51.1, "statusbyte": "48", "co2": 6.8, "tcat": 236.6, "timestamp": "2018-06-12T13:49:57.640692Z", "spcat": 25, "flow": 0.51, "countdown": 0, "spband": 330, "toven": 29.1, "tcoil": 27, "spcoil": 150, "spoven": 800, "curr": 16, "runtime": 131009.25, "tband": 333.4, "pco2": 90}]}

print(main(data))
