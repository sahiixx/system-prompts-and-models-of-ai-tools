"""
Comprehensive Unit Tests for agent/runtime/process_manager.py
Tests ProcessManager and ManagedProcess classes
"""

import unittest
import sys
import os
import time
import signal
import subprocess
from unittest.mock import patch, MagicMock, call

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.runtime.process_manager import ProcessManager, ManagedProcess


class TestManagedProcess(unittest.TestCase):
    """Test suite for ManagedProcess dataclass"""

    def test_managed_process_creation(self):
        """Test ManagedProcess can be created with all fields"""
        proc = ManagedProcess(pid=12345, command="echo test", cwd="/home")
        
        self.assertEqual(proc.pid, 12345)
        self.assertEqual(proc.command, "echo test")
        self.assertEqual(proc.cwd, "/home")

    def test_managed_process_dataclass_equality(self):
        """Test ManagedProcess equality comparison"""
        proc1 = ManagedProcess(pid=100, command="cmd1", cwd="/home")
        proc2 = ManagedProcess(pid=100, command="cmd1", cwd="/home")
        proc3 = ManagedProcess(pid=101, command="cmd1", cwd="/home")
        
        self.assertEqual(proc1, proc2)
        self.assertNotEqual(proc1, proc3)

    def test_managed_process_fields_accessible(self):
        """Test ManagedProcess fields are accessible"""
        proc = ManagedProcess(pid=999, command="test", cwd="/home")
        
        self.assertTrue(hasattr(proc, 'pid'))
        self.assertTrue(hasattr(proc, 'command'))
        self.assertTrue(hasattr(proc, 'cwd'))


class TestProcessManager(unittest.TestCase):
    """Test suite for ProcessManager class"""

    def setUp(self):
        """Set up test fixtures"""
        self.pm = ProcessManager()

    def test_initialization(self):
        """Test ProcessManager initializes with empty process dict"""
        self.assertIsInstance(self.pm._procs, dict)
        self.assertEqual(len(self.pm._procs), 0)

    @patch('subprocess.Popen')
    def test_launch_basic(self, mock_popen):
        """Test launch creates and tracks a process"""
        mock_proc = MagicMock()
        mock_proc.pid = 12345
        mock_popen.return_value = mock_proc
        
        pid = self.pm.launch("echo 'hello'")
        
        self.assertEqual(pid, 12345)
        self.assertIn(12345, self.pm._procs)
        self.assertEqual(self.pm._procs[12345].command, "echo 'hello'")
        mock_popen.assert_called_once()

    @patch('subprocess.Popen')
    @patch('os.getcwd', return_value='/default/cwd')
    def test_launch_with_default_cwd(self, _mock_getcwd, mock_popen):
        """Test launch uses current directory when cwd not specified"""
        mock_proc = MagicMock()
        mock_proc.pid = 100
        mock_popen.return_value = mock_proc
        
        self.pm.launch("ls")
        
        mock_popen.assert_called_once_with(
            "ls",
            cwd='/default/cwd',
            shell=True,
            executable="/bin/bash"
        )

    @patch('subprocess.Popen')
    def test_launch_with_custom_cwd(self, mock_popen):
        """Test launch with custom working directory"""
        mock_proc = MagicMock()
        mock_proc.pid = 200
        mock_popen.return_value = mock_proc
        
        self.pm.launch("pwd", cwd="/custom/path")
        
        mock_popen.assert_called_once_with(
            "pwd",
            cwd="/custom/path",
            shell=True,
            executable="/bin/bash"
        )
        self.assertEqual(self.pm._procs[200].cwd, "/custom/path")

    @patch('subprocess.Popen')
    def test_launch_multiple_processes(self, mock_popen):
        """Test launching multiple processes"""
        mock_proc1 = MagicMock()
        mock_proc1.pid = 1000
        mock_proc2 = MagicMock()
        mock_proc2.pid = 2000
        mock_popen.side_effect = [mock_proc1, mock_proc2]
        
        self.pm.launch("cmd1")
        self.pm.launch("cmd2")
        
        self.assertEqual(len(self.pm._procs), 2)
        self.assertIn(1000, self.pm._procs)
        self.assertIn(2000, self.pm._procs)

    @patch('subprocess.Popen')
    @patch('os.kill')
    def test_kill_existing_process(self, mock_kill, mock_popen):
        """Test killing an existing process"""
        mock_proc = MagicMock()
        mock_proc.pid = 5000
        mock_popen.return_value = mock_proc
        
        self.pm.launch("sleep 100")
        result = self.pm.kill(5000)
        
        self.assertTrue(result)
        mock_kill.assert_called_once_with(5000, signal.SIGKILL)
        self.assertNotIn(5000, self.pm._procs)

    def test_kill_nonexistent_process(self):
        """Test killing a process that was never launched"""
        result = self.pm.kill(99999)
        
        self.assertFalse(result)

    @patch('subprocess.Popen')
    @patch('os.kill', side_effect=ProcessLookupError())
    def test_kill_process_already_dead(self, _mock_kill, mock_popen):
        """Test killing a process that already terminated"""
        mock_proc = MagicMock()
        mock_proc.pid = 6000
        mock_popen.return_value = mock_proc
        
        self.pm.launch("quick_command")
        result = self.pm.kill(6000)
        
        self.assertFalse(result)
        self.assertNotIn(6000, self.pm._procs)

    @patch('subprocess.Popen')
    @patch('os.kill', side_effect=PermissionError())
    def test_kill_process_permission_error(self, _mock_kill, mock_popen):
        """Test killing a process with insufficient permissions"""
        mock_proc = MagicMock()
        mock_proc.pid = 7000
        mock_popen.return_value = mock_proc
        
        self.pm.launch("protected_command")
        result = self.pm.kill(7000)
        
        self.assertFalse(result)
        self.assertNotIn(7000, self.pm._procs)

    @patch('subprocess.Popen')
    def test_list_empty(self, _mock_popen):
        """Test list returns empty dict when no processes"""
        processes = self.pm.list()
        
        self.assertIsInstance(processes, dict)
        self.assertEqual(len(processes), 0)

    @patch('subprocess.Popen')
    def test_list_with_processes(self, mock_popen):
        """Test list returns all tracked processes"""
        mock_proc1 = MagicMock()
        mock_proc1.pid = 1111
        mock_proc2 = MagicMock()
        mock_proc2.pid = 2222
        mock_popen.side_effect = [mock_proc1, mock_proc2]
        
        self.pm.launch("process1")
        self.pm.launch("process2")
        
        processes = self.pm.list()
        
        self.assertEqual(len(processes), 2)
        self.assertIn(1111, processes)
        self.assertIn(2222, processes)
        self.assertIsInstance(processes[1111], ManagedProcess)
        self.assertEqual(processes[1111].command, "process1")

    @patch('subprocess.Popen')
    def test_list_returns_copy(self, mock_popen):
        """Test list returns a copy, not the internal dict"""
        mock_proc = MagicMock()
        mock_proc.pid = 3333
        mock_popen.return_value = mock_proc
        
        self.pm.launch("test_cmd")
        processes = self.pm.list()
        processes.clear()
        
        # Internal state should not be affected
        self.assertEqual(len(self.pm._procs), 1)

    @patch('subprocess.Popen')
    def test_launch_with_complex_command(self, mock_popen):
        """Test launch with complex shell command"""
        mock_proc = MagicMock()
        mock_proc.pid = 4444
        mock_popen.return_value = mock_proc
        
        complex_cmd = "echo 'test' | grep test && echo 'done'"
        self.pm.launch(complex_cmd)
        
        self.assertEqual(self.pm._procs[4444].command, complex_cmd)
        mock_popen.assert_called_once_with(
            complex_cmd,
            cwd=unittest.mock.ANY,
            shell=True,
            executable="/bin/bash"
        )

    @patch('subprocess.Popen')
    def test_launch_uses_bash_shell(self, mock_popen):
        """Test launch uses bash as executable"""
        mock_proc = MagicMock()
        mock_proc.pid = 5555
        mock_popen.return_value = mock_proc
        
        self.pm.launch("test")
        
        call_args = mock_popen.call_args
        self.assertEqual(call_args[1]['executable'], "/bin/bash")
        self.assertTrue(call_args[1]['shell'])

    @patch('subprocess.Popen')
    @patch('os.kill')
    def test_kill_removes_from_internal_dict(self, _mock_kill, mock_popen):
        """Test kill removes process from internal tracking"""
        mock_proc = MagicMock()
        mock_proc.pid = 8888
        mock_popen.return_value = mock_proc
        
        self.pm.launch("test")
        self.assertIn(8888, self.pm._procs)
        
        self.pm.kill(8888)
        self.assertNotIn(8888, self.pm._procs)

    @patch('subprocess.Popen')
    @patch('os.kill', side_effect=Exception("Unexpected error"))
    def test_kill_handles_unexpected_exception(self, _mock_kill, mock_popen):
        """Test kill handles unexpected exceptions gracefully"""
        mock_proc = MagicMock()
        mock_proc.pid = 9999
        mock_popen.return_value = mock_proc
        
        self.pm.launch("test")
        result = self.pm.kill(9999)
        
        self.assertFalse(result)
        self.assertNotIn(9999, self.pm._procs)


class TestProcessManagerIntegration(unittest.TestCase):
    """Integration tests for ProcessManager with real processes"""

    def setUp(self):
        """Set up test fixtures"""
        self.pm = ProcessManager()
        self.launched_pids = []

    def tearDown(self):
        """Clean up any processes we launched"""
        for pid in self.launched_pids:
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass

    def test_launch_and_kill_real_process(self):
        """Test launching and killing a real process"""
        # Launch a long-running process
        pid = self.pm.launch("sleep 60")
        self.launched_pids.append(pid)
        
        # Verify it was tracked
        self.assertIn(pid, self.pm._procs)
        
        # Wait a moment to ensure process started
        time.sleep(0.1)
        
        # Verify process exists
        try:
            os.kill(pid, 0)  # Signal 0 checks existence
            process_exists = True
        except OSError:
            process_exists = False
        
        if process_exists:
            # Kill the process
            result = self.pm.kill(pid)
            self.assertTrue(result)
            
            # Wait for process to die
            time.sleep(0.1)
            
            # Verify it's gone
            self.assertNotIn(pid, self.pm._procs)

    def test_launch_multiple_and_list(self):
        """Test launching multiple processes and listing them"""
        pid1 = self.pm.launch("sleep 30")
        pid2 = self.pm.launch("sleep 30")
        self.launched_pids.extend([pid1, pid2])
        
        processes = self.pm.list()
        self.assertEqual(len(processes), 2)
        self.assertIn(pid1, processes)
        self.assertIn(pid2, processes)
        
        # Clean up
        self.pm.kill(pid1)
        self.pm.kill(pid2)


class TestProcessManagerEdgeCases(unittest.TestCase):
    """Test suite for ProcessManager edge cases"""

    def setUp(self):
        """Set up test fixtures"""
        self.pm = ProcessManager()

    @patch('subprocess.Popen')
    def test_launch_with_empty_command(self, mock_popen):
        """Test launch with empty command string"""
        mock_proc = MagicMock()
        mock_proc.pid = 10000
        mock_popen.return_value = mock_proc
        
        pid = self.pm.launch("")
        
        self.assertEqual(pid, 10000)
        self.assertEqual(self.pm._procs[10000].command, "")

    @patch('subprocess.Popen')
    def test_launch_with_special_characters(self, mock_popen):
        """Test launch with special characters in command"""
        mock_proc = MagicMock()
        mock_proc.pid = 11000
        mock_popen.return_value = mock_proc
        
        special_cmd = "echo '$VAR' && test -f 'file with spaces.txt'"
        self.pm.launch(special_cmd)
        
        self.assertEqual(self.pm._procs[11000].command, special_cmd)

    @patch('subprocess.Popen', side_effect=OSError("Fork failed"))
    def test_launch_when_popen_fails(self, _mock_popen):
        """Test launch when subprocess.Popen fails"""
        with self.assertRaises(OSError):
            self.pm.launch("failing_command")

    def test_kill_zero_pid(self):
        """Test kill with pid 0"""
        result = self.pm.kill(0)
        self.assertFalse(result)

    def test_kill_negative_pid(self):
        """Test kill with negative pid"""
        result = self.pm.kill(-1)
        self.assertFalse(result)


if __name__ == '__main__':
    unittest.main()