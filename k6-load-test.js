import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 100 }, // Baseline
        { duration: '1m', target: 500 },  # Stress
        { duration: '30s', target: 50 },  # Recovery
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must complete within 500ms
        http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
    },
};

export default function () {
    const res = http.get('http://localhost:8000/health');
    check(res, {
        'status is 200': (r) => r.status === 200,
        'health is healthy': (r) => r.json().status === 'healthy',
    });
    sleep(1);
}
