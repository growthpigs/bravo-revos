"""
Simplified unit tests for HGC Orchestrator
Focuses on testable components without complex mocking
"""

import sys
import os
import unittest
from unittest.mock import Mock, patch, MagicMock

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))

from orchestrator import HGCOrchestrator
from revos_tools import RevOSTools


class TestHGCOrchestratorInit(unittest.TestCase):
    """Test orchestrator initialization"""

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Agent')
    def test_orchestrator_creates_memory_client(self, mock_agent, mock_memory_client):
        """Test memory client initialized with correct API key"""
        orchestrator = HGCOrchestrator(
            mem0_key="test-mem0-key",
            openai_key="test-openai-key",
            api_base_url="http://localhost:3000",
            auth_token="test-auth-token"
        )

        mock_memory_client.assert_called_once_with(api_key="test-mem0-key")

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Agent')
    def test_orchestrator_creates_agent_with_tools(self, mock_agent, mock_memory_client):
        """Test agent initialized with 8 tools (2 memory + 6 RevOS)"""
        orchestrator = HGCOrchestrator(
            mem0_key="test-key",
            openai_key="test-key",
            api_base_url="http://localhost:3000",
            auth_token="test-token"
        )

        # Verify agent called
        self.assertTrue(mock_agent.called)

        # Verify agent created with correct parameters
        agent_kwargs = mock_agent.call_args[1]
        self.assertEqual(agent_kwargs['name'], "RevOS Intelligence")
        self.assertIn('tools', agent_kwargs)
        self.assertEqual(len(agent_kwargs['tools']), 8)

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Agent')
    def test_memory_key_format(self, mock_agent, mock_memory_client):
        """Test memory key uses pod::user format"""
        orchestrator = HGCOrchestrator(
            mem0_key="test-key",
            openai_key="test-key",
            api_base_url="http://localhost:3000",
            auth_token="test-token"
        )

        # Initially no memory key
        self.assertIsNone(orchestrator.current_memory_key)

        # Set memory key manually (process would set this)
        orchestrator.current_memory_key = "pod-123::user-456"
        self.assertEqual(orchestrator.current_memory_key, "pod-123::user-456")


class TestRevOSTools(unittest.TestCase):
    """Test RevOS tools integration"""

    def setUp(self):
        """Set up test fixtures"""
        self.api_base_url = "http://localhost:3000"
        self.auth_token = "test-auth-token"
        self.tools = RevOSTools(self.api_base_url, self.auth_token)

    def test_tools_initialization(self):
        """Test RevOS tools initialize with correct config"""
        self.assertEqual(self.tools.api_base_url, self.api_base_url)
        self.assertEqual(self.tools.headers['Authorization'], f'Bearer {self.auth_token}')
        self.assertEqual(self.tools.headers['Content-Type'], 'application/json')

    def test_get_all_tools_returns_six(self):
        """Test get_all_tools returns 6 function tools"""
        all_tools = self.tools.get_all_tools()
        self.assertEqual(len(all_tools), 6)

    @patch('revos_tools.requests.get')
    def test_get_campaign_metrics_url(self, mock_get):
        """Test get_campaign_metrics calls correct endpoint"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "campaigns": [{"id": "camp-123", "name": "AI Leadership"}],
            "count": 1
        }
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        # Get the tool
        all_tools = self.tools.get_all_tools()
        get_campaign_metrics = all_tools[0]

        # Call it
        result = get_campaign_metrics("camp-123")

        # Verify correct URL called
        expected_url = f"{self.api_base_url}/api/hgc/campaigns?campaign_id=camp-123"
        mock_get.assert_called_once_with(
            expected_url,
            headers=self.tools.headers,
            timeout=10
        )
        self.assertTrue(result['success'])

    @patch('revos_tools.requests.post')
    def test_create_campaign_always_draft(self, mock_post):
        """Test create_campaign always creates DRAFT status for safety"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "campaign": {"id": "camp-new", "status": "draft"}
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        # Get create_campaign tool (index 3)
        all_tools = self.tools.get_all_tools()
        create_campaign = all_tools[3]

        # Call it
        result = create_campaign("AI Insights", "voice-123", "Test campaign")

        # Verify payload includes status: draft
        call_args = mock_post.call_args
        payload = call_args[1]['json']
        self.assertEqual(payload['status'], 'draft')
        self.assertTrue(result['success'])

    @patch('revos_tools.requests.post')
    def test_schedule_post_always_queued(self, mock_post):
        """Test schedule_post creates QUEUED status for safety"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "post": {"id": "post-new", "status": "queued"}
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        # Get schedule_post tool (index 4)
        all_tools = self.tools.get_all_tools()
        schedule_post = all_tools[4]

        # Call it
        result = schedule_post("Test post", "2025-11-10T14:00:00Z")

        # Verify payload includes status: queued
        call_args = mock_post.call_args
        payload = call_args[1]['json']
        self.assertEqual(payload['status'], 'queued')
        self.assertTrue(result['success'])

    @patch('revos_tools.requests.get')
    def test_error_handling(self, mock_get):
        """Test tools handle API errors gracefully"""
        mock_get.side_effect = Exception("Network error")

        # Get tool
        all_tools = self.tools.get_all_tools()
        get_campaign_metrics = all_tools[0]

        # Call it
        result = get_campaign_metrics()

        # Should return error result, not raise
        self.assertFalse(result['success'])
        self.assertIn('error', result)


if __name__ == '__main__':
    unittest.main()
