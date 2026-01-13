"""
Comprehensive Unit Tests for agent/runtime/process_manager.py
Tests ProcessManager class for launching, managing, and killing processes
"""

import unittest
import sys
import os
import signal
import tempfile
from unittest.mock import patch, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.runtime.process_manager import ProcessManager, ManagedProcess


class TestManagedProcess(unittest.TestCase):
    """Test suite for ManagedProcess dataclass"""
    
    def test_managed_process_creation(self):
        """Test creating ManagedProcess with all fields"""
        proc = ManagedProcess(pid=1234, command="echo hello", cwd=tempfile.gettempdir())
        self.assertEqual(proc.pid, 1234)
        self.assertEqual(proc.command, "echo hello")
        self.assertEqual(proc.cwd, tempfile.gettempdir())


class TestProcessManagerInitialization(unittest.TestCase):
    """Test suite for ProcessManager initialization"""
    
    def test_process_manager_init(self):
        """Test ProcessManager initializes with empty process dict"""
        pm = ProcessManager()
        self.assertIsNotNone(pm._procs)
        self.assertEqual(len(pm._procs), 0)
        self.assertIsInstance(pm._procs, dict)


class TestProcessManagerLaunch(unittest.TestCase):
    """Test suite for ProcessManager.launch method"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.pm = ProcessManager()
    
    @patch('agent.runtime.process_manager.subprocess.Popen')
    def test_launch_simple_command(self, mock_popen):
        """Test launching a simple command"""
        mock_proc = Mock()
        mock_proc.pid = 1234
        mock_popen.return_value = mock_proc
        
        pid = self.pm.launch("echo hello")
        
        self.assertEqual(pid, 1234)
        self.assertIn(1234, self.pm._procs)
        mock_popen.assert_called_once()
    
    @patch('agent.runtime.process_manager.subprocess.Popen')
    def test_launch_with_custom_cwd(self, mock_popen):
        """Test launching command with custom working directory"""
        mock_proc = Mock()
        mock_proc.pid = 5678
        mock_popen.return_value = mock_proc
        
        pid = self.pm.launch("ls -la", cwd=tempfile.gettempdir())
        
        self.assertEqual(pid, 5678)
        call_kwargs = mock_popen.call_args[1]
        self.assertEqual(call_kwargs['cwd'], tempfile.gettempdir())
    
    @patch('agent.runtime.process_manager.subprocess.Popen')
    def test_launch_stores_process_info(self, mock_popen):
        """Test that launch stores complete process information"""
        mock_proc = Mock()
        mock_proc.pid = 9999
        mock_popen.return_value = mock_proc
        
        self.pm.launch("python script.py", cwd="/app")
        
        proc_info = self.pm._procs[9999]
        self.assertEqual(proc_info.pid, 9999)
        self.assertEqual(proc_info.command, "python script.py")
        self.assertEqual(proc_info.cwd, "/app")
    
    @patch('agent.runtime.process_manager.subprocess.Popen')
    @patch('os.getcwd', return_value='/default/cwd')
    def test_launch_uses_current_dir_when_no_cwd(self, _, mock_popen):
        """Test that launch uses current directory when cwd not provided"""
        mock_proc = Mock()
        mock_proc.pid = 1111
        mock_popen.return_value = mock_proc
        
        self.pm.launch("pwd")
        
        proc_info = self.pm._procs[1111]
        self.assertEqual(proc_info.cwd, '/default/cwd')
    
    @patch('agent.runtime.process_manager.subprocess.Popen')
    def test_launch_uses_bash_shell(self, mock_popen):
        """Test that launch uses bash as executable"""
        mock_proc = Mock()
        mock_proc.pid = 2222
        mock_popen.return_value = mock_proc
        
        self.pm.launch("echo test")
        
        call_kwargs = mock_popen.call_args[1]
        self.assertEqual(call_kwargs['executable'], "/bin/bash")
        self.assertTrue(call_kwargs['shell'])


class TestProcessManagerKill(unittest.TestCase):
    """Test suite for ProcessManager.kill method"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.pm = ProcessManager()
    
    def test_kill_nonexistent_process(self):
        """Test killing a process that doesn't exist in registry"""
        result = self.pm.kill(9999)
        self.assertFalse(result)
    
    @patch('agent.runtime.process_manager.subprocess.Popen')
    @patch('os.kill')
    def test_kill_existing_process(self, mock_kill, mock_popen):
        """Test killing an existing process"""
        mock_proc = Mock()
        mock_proc.pid = 1234
        mock_popen.return_value = mock_proc
        
        pid = self.pm.launch("sleep 100")
        result = self.pm.kill(pid)
        
        self.assertTrue(result)
        mock_kill.assert_called_once_with(1234, signal.SIGKILL)
        self.assertNotIn(1234, self.pm._procs)
    
    @patch('agent.runtime.process_manager.subprocess.Popen')
    @patch('os.kill', side_effect=ProcessLookupError("No such process"))
    def test_kill_process_not_running(self, _, mock_popen):
        """Test killing a process that is no longer running"""
        mock_proc = Mock()
        mock_proc.pid = 5678
        mock_popen.return_value = mock_proc
        
        pid = self.pm.launch("echo done")
        result = self.pm.kill(pid)
        
        # Should return False but still remove from registry
        self.assertFalse(result)
        self.assertNotIn(5678, self.pm._procs)


class TestProcessManagerList(unittest.TestCase):
    """Test suite for ProcessManager.list method"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.pm = ProcessManager()
    
    def test_list_empty_processes(self):
        """Test listing when no processes are running"""
        procs = self.pm.list()
        self.assertEqual(len(procs), 0)
        self.assertIsInstance(procs, dict)
    
    @patch('agent.runtime.process_manager.subprocess.Popen')
    def test_list_single_process(self, mock_popen):
        """Test listing with one process"""
        mock_proc = Mock()
        mock_proc.pid = 1234
        mock_popen.return_value = mock_proc
        
        self.pm.launch("echo test")
        procs = self.pm.list()
        
        self.assertEqual(len(procs), 1)
        self.assertIn(1234, procs)
        self.assertEqual(procs[1234].command, "echo test")
    
    @patch('agent.runtime.process_manager.subprocess.Popen')
    def test_list_returns_copy_not_reference(self, mock_popen):
        """Test that list returns a copy, not the internal dict"""
        mock_proc = Mock()
        mock_proc.pid = 5555
        mock_popen.return_value = mock_proc
        
        self.pm.launch("test")
        procs1 = self.pm.list()
        procs2 = self.pm.list()
        
        self.assertIsNot(procs1, procs2)
        self.assertIsNot(procs1, self.pm._procs)


if __name__ == '__main__':
    unittest.main()