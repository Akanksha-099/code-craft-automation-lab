
import http from "k6/http";
import { sleep, group } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

export const TrendRTT = new Trend('RTT');
export const RateContentOK = new Rate('ContentOK');
export const GaugeContentSize = new Gauge('ContentSize');
export const CounterErrors = new Counter('Errors');
export let options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp-up to 10 virtual users in 30 seconds
    { duration: '1m', target: 10 },  // Stay at 10 virtual users for 1 minute
    { duration: '30s', target: 0 },  // Ramp-down to 0 virtual users in 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // Set a performance threshold for 95th percentile response time
    'Errors': ['count<100'],
    // Gauge: the K6 demo page should remain smaller than 10000 bytes
    'ContentSize': ['value<10000'],
    // Rate: content must be OK more than 95 times
    'ContentOK': ['rate>0.95'],
    // Trend: Percentiles, averages, medians, and minimums
    // must be within specified milliseconds.
    'RTT': ['p(99)<300', 'p(70)<250', 'avg<200', 'med<150', 'min<100'],
  
  },
};

export default function () {
  group('Homepage', function () {
    const response = http.get('https://quickpizza.grafana.com/test.k6.io/');
    const contentOK = response.status === 200 && response.body.includes('test.k6.io');

    TrendRTT.add(response.timings.duration);
    RateContentOK.add(contentOK);
    GaugeContentSize.add(response.body.length);
    CounterErrors.add(!contentOK);
  
  });

  
  sleep(1); // Add a sleep between iterations to control the rate of requests per VU (e.g., 1 request per second)
}


export function handleSummary(data) {
    return {
      "summary/result.html": htmlReport(data),
      stdout: textSummary(data, { indent: " ", enableColors: true }),
      'summary/summary.json': JSON.stringify(data) 
    };
  }
