import json
import re
from typing import Dict, Any


class BaseLogParser:
    def parse(self, raw_content: str, default_hostname: str) -> Dict[str, Any]:
        raise NotImplementedError


class JSONLogParser(BaseLogParser):
    def parse(self, raw_content: str, default_hostname: str) -> Dict[str, Any]:
        try:
            data = json.loads(raw_content)
        except Exception:
            data = {"message": raw_content}
            
        return {
            "hostname": data.get("hostname", default_hostname),
            "username": data.get("username", data.get("user")),
            "event_type": data.get("event_type", "JSON_LOG"),
            "event_category": data.get("category", "Application"),
            "severity": data.get("severity", "INFO"),
            "source_ip": data.get("source_ip", data.get("src_ip")),
            "destination_ip": data.get("destination_ip", data.get("dst_ip")),
            "process_name": data.get("process_name", data.get("process")),
            "parent_process": data.get("parent_process"),
            "command_line": data.get("command_line", data.get("cmd")),
            "file_path": data.get("file_path"),
            "action": data.get("action", "EXECUTE"),
            "result": data.get("result", "SUCCESS"),
            "message": data.get("message", raw_content),
        }


class SyslogParser(BaseLogParser):
    def parse(self, raw_content: str, default_hostname: str) -> Dict[str, Any]:
        # Typical Syslog: <PRI>TIMESTAMP HOSTNAME TAG: MESSAGE
        pattern = r"^(?:<(?P<pri>\d+)>)?\s*(?P<timestamp>\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2})?\s*(?P<hostname>\S+)?\s*(?P<tag>\S+?):\s*(?P<msg>.*)$"
        match = re.match(pattern, raw_content)
        if match:
            gd = match.groupdict()
            msg = gd.get("msg") or raw_content
            hostname = gd.get("hostname") or default_hostname
            return {
                "hostname": hostname,
                "username": None,
                "event_type": "SYSLOG",
                "event_category": "System",
                "severity": "INFO",
                "source_ip": None,
                "destination_ip": None,
                "process_name": gd.get("tag"),
                "message": msg,
                "action": "LOG",
                "result": "SUCCESS"
            }
        return {
            "hostname": default_hostname,
            "event_type": "SYSLOG_UNPARSED",
            "event_category": "System",
            "severity": "INFO",
            "message": raw_content,
            "action": "LOG",
            "result": "SUCCESS"
        }


class SysmonLogParser(BaseLogParser):
    def parse(self, raw_content: str, default_hostname: str) -> Dict[str, Any]:
        # Example Sysmon: EventID=1 Image=C:\cmd.exe CommandLine=cmd.exe User=SYSTEM
        kv_pairs = dict(re.findall(r'(\w+)=([^\s]+|"[^"]*")', raw_content))
        event_id = kv_pairs.get("EventID", "1")
        
        category_map = {
            "1": "Process_Creation",
            "3": "Network_Connect",
            "7": "Image_Load",
            "11": "File_Create"
        }
        
        return {
            "hostname": kv_pairs.get("Computer", default_hostname),
            "username": kv_pairs.get("User", "SYSTEM"),
            "event_type": f"SYSMON_EVENT_{event_id}",
            "event_category": category_map.get(str(event_id), "Endpoint_Telemetry"),
            "severity": "MEDIUM" if str(event_id) in ["1", "3"] else "INFO",
            "source_ip": kv_pairs.get("SourceIp"),
            "destination_ip": kv_pairs.get("DestinationIp"),
            "process_name": kv_pairs.get("Image"),
            "parent_process": kv_pairs.get("ParentImage"),
            "command_line": kv_pairs.get("CommandLine"),
            "file_path": kv_pairs.get("TargetFilename"),
            "action": "SYSMON_TELEMETRY",
            "result": "SUCCESS",
            "message": raw_content
        }


class ParserFactory:
    @staticmethod
    def get_parser(source_name: str) -> BaseLogParser:
        s = source_name.lower()
        if "sysmon" in s:
            return SysmonLogParser()
        elif "syslog" in s:
            return SyslogParser()
        else:
            return JSONLogParser()
