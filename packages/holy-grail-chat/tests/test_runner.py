"""
Unit tests for HGC Runner
Tests subprocess wrapper and environment variable handling
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock
import json

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))


class TestHGCRunner(unittest.TestCase):
    """Test suite for HGC Runner"""

    def setUp(self):
        """Set up test fixtures"""
        self.valid_context = {
            "user_id": "user-123",
            "pod_id": "pod-456",
            "messages": [{"role": "user", "content": "Hello"}],
            "api_base_url": "http://localhost:3000",
            "mem0_key": "test-mem0-key",
            "openai_key": "test-openai-key",
            "auth_token": "test-auth-token"
        }

    @patch('runner.HGCOrchestrator')
    @patch.dict(os.environ, {}, clear=True)
    def test_missing_hgc_context(self, mock_orchestrator):
        """Test runner fails when HGC_CONTEXT not set"""
        # Import runner module dynamically to trigger main()
        with patch('sys.exit') as mock_exit:
            # This would normally be run as a script, so we test the logic
            from runner import main

            # Should exit with error
            with self.assertRaises(ValueError) as context:
                main()

            self.assertIn('HGC_CONTEXT', str(context.exception))

    @patch('runner.HGCOrchestrator')
    @patch.dict(os.environ, {'HGC_CONTEXT': 'invalid-json'})
    def test_invalid_json_context(self, mock_orchestrator):
        """Test runner fails on invalid JSON"""
        from runner import main

        with self.assertRaises(json.JSONDecodeError):
            main()

    @patch('runner.HGCOrchestrator')
    @patch.dict(os.environ, {'HGC_CONTEXT': '{"user_id": "123"}'})
    def test_missing_required_fields(self, mock_orchestrator):
        """Test runner fails when required fields missing"""
        from runner import main

        with self.assertRaises(ValueError) as context:
            main()

        self.assertIn('Missing required context fields', str(context.exception))

    @patch('runner.HGCOrchestrator')
    @patch('sys.exit')
    @patch('builtins.print')
    @patch.dict(os.environ, {})
    def test_successful_execution(self, mock_print, mock_exit, mock_orchestrator):
        """Test runner executes successfully with valid context"""
        # Set environment
        os.environ['HGC_CONTEXT'] = json.dumps(self.valid_context)

        # Mock orchestrator
        mock_orch_instance = MagicMock()
        mock_orchestrator.return_value = mock_orch_instance
        mock_orch_instance.process.return_value = "Test response from agent"

        from runner import main
        main()

        # Verify orchestrator initialized with correct params
        mock_orchestrator.assert_called_once_with(
            mem0_key=self.valid_context['mem0_key'],
            openai_key=self.valid_context['openai_key'],
            api_base_url=self.valid_context['api_base_url'],
            auth_token=self.valid_context['auth_token']
        )

        # Verify process called with messages
        mock_orch_instance.process.assert_called_once_with(
            messages=self.valid_context['messages'],
            user_id=self.valid_context['user_id'],
            pod_id=self.valid_context['pod_id']
        )

        # Verify JSON output printed
        output_calls = [call[0][0] for call in mock_print.call_args_list]
        json_output = next((c for c in output_calls if c.startswith('{')), None)
        self.assertIsNotNone(json_output)

        result = json.loads(json_output)
        self.assertEqual(result['content'], "Test response from agent")
        self.assertTrue(result['memory_stored'])

        # Verify exit(0) called
        mock_exit.assert_called_once_with(0)

    @patch('runner.HGCOrchestrator')
    @patch('sys.exit')
    @patch('builtins.print')
    @patch.dict(os.environ, {})
    def test_orchestrator_error_handling(self, mock_print, mock_exit, mock_orchestrator):
        """Test runner handles orchestrator errors gracefully"""
        os.environ['HGC_CONTEXT'] = json.dumps(self.valid_context)

        # Mock orchestrator to raise error
        mock_orch_instance = MagicMock()
        mock_orchestrator.return_value = mock_orch_instance
        mock_orch_instance.process.side_effect = Exception("Agent failed")

        from runner import main
        main()

        # Verify error printed to stderr
        stderr_calls = [call for call in mock_print.call_args_list if call[1].get('file') == sys.stderr]
        self.assertTrue(len(stderr_calls) > 0)

        # Verify exit(1) called
        mock_exit.assert_called_once_with(1)


if __name__ == '__main__':
    unittest.main()
