import sys, json
import time
from datetime import datetime
import numpy as np

# # simple JSON echo script
# for line in sys.stdin:
#     print(json.dumps(json.loads(line)))

def format_date(rows):
    for row in rows:
        row['timestamp'] = datetime.strptime(row['timestamp'],'%Y-%m-%dT%H:%M:%S.%fZ')
    return rows

def main(params):
    data = json.loads(params)
    rows = data['rows']

    t0 = datetime.strptime(data['timestamps']['t0'],'%Y-%m-%dT%H:%M:%S.%fZ')
    t1 = datetime.strptime(data['timestamps']['t1'],'%Y-%m-%dT%H:%M:%S.%fZ')
    t2 = datetime.strptime(data['timestamps']['t2'],'%Y-%m-%dT%H:%M:%S.%fZ')

    ppmtoug = 12.01/22.4

    rows = format_date(rows)
    baseline_co2 = [];

    flow = [];
    toven = []
    co2 = [];
    runtime = [];

    pco2 = []
    countdown = []

    for row in rows:
        if(row['timestamp'] < t1):
            baseline_co2.append(row['co2'])
            rows.remove(row)
        else:
            co2.append(row['co2'])
            flow.append(row['flow'])
            toven.append(row['toven'])
            runtime.append(row['runtime'])
            pco2.append(row['pco2'])
            countdown.append(row['countdown'])


    baseline = np.average(baseline_co2)
    flowrate = np.average(flow)
    max_temp = np.max(toven)
    co2 = np.array(co2) - baseline

    deltatc = (co2*ppmtoug)*flowrate
    total_carbon = np.trapz(deltatc, x=np.array(runtime))

    response = {'rows': []}
    for i in range(len(deltatc)):
        response['rows'].append({
            'runtime': runtime[i],
            'toven': toven[i],
            'pco2': pco2[i],
            'co2': co2[i] + baseline,
            'flow': flow[i],
            'countdown': countdown[i],
            'co2_minus_baseline': co2[i],
            'deltatc': deltatc[i]
        });

    print(json.dumps(response))

main(sys.stdin.readline())
