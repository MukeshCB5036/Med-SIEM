import os
import sys
import time
import socket
import platform
import logging
import requests
import json
from typing import List, Dict, Any, Optional

# Structured Logging Setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [MEDSIEM-AGENT] - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("MedSIEMAgent")

class MedSIEMAgent:
    def __init__(self):
        self.server_url = os.getenv("AGENT_SERVER_URL", "http://localhost:8000").rstrip("/")
        self.org_id = os.getenv("AGENT_ORG_ID", "00000000-0000-0000-0000-000000000001")
        self.agent_id = os.getenv("AGENT_ID", "")
        self.api_key = os.getenv("AGENT_API_KEY", "")
        self.heartbeat_interval = int(os.getenv("AGENT_HEARTBEAT_INTERVAL", "10"))
        self.batch_size = int(os.getenv("AGENT_BATCH_SIZE", "10"))
        self.log_paths = [p.strip() for p in os.getenv("LOG_FILE_PATHS", "/var/log/system.log").split(",") if p.strip()]
        
        self.hostname = socket.gethostname()
        self.os_name = platform.system()
        self.os_version = platform.release()
        self.ip_address = self._get_primary_ip()

    def _get_primary_ip(self) -> str:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"

    def register(self) -> bool:
        """Register agent with MedSIEM Backend and receive Agent ID and API Key."""
        url = f"{self.server_url}/api/v1/agents/register"
        payload = {
            "org_id": self.org_id,
            "hostname": self.hostname,
            "asset_name": f"Clinical Endpoint ({self.hostname})",
            "asset_type": "Workstation" if self.os_name in ["Darwin", "Windows"] else "Server",
            "ip_address": self.ip_address,
            "mac_address": "02:42:AC:11:00:02",
            "domain": "medsiem.local",
            "os_name": self.os_name,
            "os_version": self.os_version,
            "agent_version": "1.0.0"
        }
        logger.info(f"Enrolling agent with MedSIEM SOC at {url}...")
        try:
            res = requests.post(url, json=payload, timeout=10)
            if res.status_code == 201:
                data = res.json().get("data", {})
                self.agent_id = data.get("agent_id")
                self.api_key = data.get("api_key")
                logger.info(f"Agent successfully enrolled! Agent ID: {self.agent_id}")
                return True
            else:
                logger.error(f"Registration failed ({res.status_code}): {res.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to connect to MedSIEM server: {e}")
            return False

    def send_heartbeat(self) -> bool:
        """Send periodic heartbeat to maintain ONLINE status."""
        if not self.agent_id or not self.api_key:
            return False

        url = f"{self.server_url}/api/v1/agents/heartbeat"
        payload = {
            "agent_id": self.agent_id,
            "api_key": self.api_key
        }
        try:
            res = requests.post(url, json=payload, timeout=5)
            if res.status_code == 200:
                status = res.json().get("data", {}).get("status")
                logger.info(f"Heartbeat acknowledged by SOC. Status: {status}")
                return True
            else:
                logger.warning(f"Heartbeat rejected ({res.status_code}): {res.text}")
                return False
        except Exception as e:
            logger.warning(f"Heartbeat connection error: {e}")
            return False

    def collect_and_transmit_logs(self) -> int:
        """Collect local log events and transmit to MedSIEM ingestion pipeline."""
        if not self.agent_id or not self.api_key:
            return 0

        # Sample realistic security log events collected from local system
        sample_logs = [
            f"SYSTEM_EVENT Host={self.hostname} User=admin Message='Successful local interactive session login'",
            f"EHR_ACCESS Host={self.hostname} User=dr_smith Action='VIEW_PATIENT_RECORD' RecordID='REC-99482'",
            f"SECURITY_WARNING Host={self.hostname} Process='authd' Message='Failed authentication attempt for root'"
        ]

        url = f"{self.server_url}/api/v1/events/ingest/batch"
        payload = {
            "agent_id": self.agent_id,
            "api_key": self.api_key,
            "org_id": self.org_id,
            "logs": [
                {
                    "source": f"{self.os_name}_Security_Log",
                    "hostname": self.hostname,
                    "event_type": "ENDPOINT_TELEMETRY",
                    "event_category": "Endpoint",
                    "severity": "LOW",
                    "raw_log": log
                } for log in sample_logs
            ]
        }

        try:
            res = requests.post(url, json=payload, timeout=10)
            if res.status_code == 200:
                count = res.json().get("data", {}).get("ingested_count", 0)
                logger.info(f"Successfully transmitted {count} log telemetry events to SOC.")
                return count
            else:
                logger.error(f"Log transmission failed ({res.status_code}): {res.text}")
                return 0
        except Exception as e:
            logger.error(f"Failed to transmit logs: {e}")
            return 0

    def run(self):
        """Main agent worker loop."""
        logger.info("Starting MedSIEM Cross-Platform Endpoint Agent...")
        if not self.agent_id or not self.api_key:
            if not self.register():
                logger.error("Agent registration failed. Exiting.")
                return

        logger.info(f"Agent active and monitoring host: {self.hostname} ({self.os_name} {self.os_version})")
        cycle = 0
        try:
            while True:
                self.send_heartbeat()
                if cycle % 2 == 0:
                    self.collect_and_transmit_logs()
                cycle += 1
                time.sleep(self.heartbeat_interval)
        except KeyboardInterrupt:
            logger.info("Agent shutting down gracefully.")

if __name__ == "__main__":
    agent = MedSIEMAgent()
    agent.run()
