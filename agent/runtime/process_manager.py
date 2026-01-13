from __future__ import annotations
import os
import signal
import subprocess
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class ManagedProcess:
    pid: int
    command: str
    cwd: str


class ProcessManager:
    def __init__(self) -> None:
        self._procs: Dict[int, ManagedProcess] = {}

    def launch(self, command: str, cwd: Optional[str] = None) -> int:
        proc = subprocess.Popen(command, cwd=cwd or os.getcwd(), shell=True, executable="/bin/bash")
        self._procs[proc.pid] = ManagedProcess(pid=proc.pid, command=command, cwd=cwd or os.getcwd())
        return proc.pid

    def kill(self, pid: int) -> bool:
        if pid not in self._procs:
            return False
        try:
            os.kill(pid, signal.SIGKILL)
        except Exception:
            return False
        finally:
            self._procs.pop(pid, None)
        return True

    def list(self) -> Dict[int, ManagedProcess]:
        return dict(self._procs)
