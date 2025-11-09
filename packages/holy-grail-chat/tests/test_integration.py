"""
Integration tests for HGC Phase 2
Tests actual tool behavior without heavy mocking
"""

import sys
import os
import unittest
from unittest.mock import patch, Mock

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))

from revos_tools import RevOSTools


class TestRevOSToolsIntegration(unittest.TestCase):
    """Integration tests for RevOS tools"""

    def setUp(self):
        """Set up test fixtures"""
        self.tools = RevOSTools("http://localhost:3000", "test-token")

    def test_tools_structure(self):
        """Test tools return correct structure"""
        all_tools = self.tools.get_all_tools()

        # Should have 6 tools
        self.assertEqual(len(all_tools), 6)

        # All should be FunctionTool objects
        for tool in all_tools:
            self.assertTrue(hasattr(tool, 'name'))
            self.assertTrue(hasattr(tool, 'description'))
            self.assertTrue(hasattr(tool, 'on_invoke_tool'))

    def test_tool_names(self):
        """Test tools have expected names"""
        all_tools = self.tools.get_all_tools()
        tool_names = [tool.name for tool in all_tools]

        expected_names = [
            'get_campaign_metrics',
            'analyze_pod_engagement',
            'get_linkedin_performance',
            'create_campaign',
            'schedule_post',
            'analyze_campaign_performance'
        ]

        for expected in expected_names:
            self.assertIn(expected, tool_names)

    @patch('revos_tools.requests.get')
    def test_campaign_metrics_api_call(self, mock_get):
        """Test get_campaign_metrics makes correct API call"""
        mock_response = Mock()
        mock_response.json.return_value = {"campaigns": [], "count": 0}
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        all_tools = self.tools.get_all_tools()
        get_campaign_metrics = next(t for t in all_tools if t.name == 'get_campaign_metrics')

        # Invoke the tool
        result = get_campaign_metrics.on_invoke_tool(campaign_id="test-123")

        # Verify API called
        expected_url = "http://localhost:3000/api/hgc/campaigns?campaign_id=test-123"
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        self.assertEqual(call_args[0][0], expected_url)

    @patch('revos_tools.requests.post')
    def test_create_campaign_draft_status(self, mock_post):
        """Test create_campaign enforces draft status"""
        mock_response = Mock()
        mock_response.json.return_value = {"campaign": {"id": "new", "status": "draft"}}
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        all_tools = self.tools.get_all_tools()
        create_campaign = next(t for t in all_tools if t.name == 'create_campaign')

        # Invoke the tool
        result = create_campaign.on_invoke_tool(
            name="Test Campaign",
            voice_id="voice-123",
            description="Test"
        )

        # Verify payload includes draft status
        call_args = mock_post.call_args
        payload = call_args[1]['json']
        self.assertEqual(payload['status'], 'draft')

    @patch('revos_tools.requests.post')
    def test_schedule_post_queued_status(self, mock_post):
        """Test schedule_post enforces queued status"""
        mock_response = Mock()
        mock_response.json.return_value = {"post": {"id": "new", "status": "queued"}}
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        all_tools = self.tools.get_all_tools()
        schedule_post = next(t for t in all_tools if t.name == 'schedule_post')

        # Invoke the tool
        result = schedule_post.on_invoke_tool(
            content="Test post",
            schedule_time="2025-11-10T14:00:00Z"
        )

        # Verify payload includes queued status
        call_args = mock_post.call_args
        payload = call_args[1]['json']
        self.assertEqual(payload['status'], 'queued')

    @patch('revos_tools.requests.get')
    def test_error_handling(self, mock_get):
        """Test tools handle errors gracefully"""
        mock_get.side_effect = Exception("Network error")

        all_tools = self.tools.get_all_tools()
        get_campaign_metrics = next(t for t in all_tools if t.name == 'get_campaign_metrics')

        # Should not raise, should return error dict
        result = get_campaign_metrics.on_invoke_tool()

        self.assertFalse(result['success'])
        self.assertIn('error', result)


class TestOrchestratorConfiguration(unittest.TestCase):
    """Test orchestrator configuration"""

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Agent')
    def test_orchestrator_initialization(self, mock_agent, mock_memory_client):
        """Test orchestrator initializes correctly"""
        from orchestrator import HGCOrchestrator

        orch = HGCOrchestrator(
            mem0_key="test-mem0",
            openai_key="test-openai",
            api_base_url="http://localhost:3000",
            auth_token="test-token"
        )

        # Verify memory client created
        mock_memory_client.assert_called_once_with(api_key="test-mem0")

        # Verify agent created with tools
        self.assertTrue(mock_agent.called)
        agent_kwargs = mock_agent.call_args[1]
        self.assertEqual(agent_kwargs['model'], 'gpt-4')
        self.assertIn('tools', agent_kwargs)

        # Should have 8 tools total (2 memory + 6 RevOS)
        self.assertEqual(len(agent_kwargs['tools']), 8)


if __name__ == '__main__':
    unittest.main()
