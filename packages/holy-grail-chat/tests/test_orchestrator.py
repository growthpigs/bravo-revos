"""
Unit tests for HGC Orchestrator
Tests AgentKit + Mem0 + RevOS tool integration
"""

import sys
import os
import unittest
from unittest.mock import Mock, patch, MagicMock
import json

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))

from orchestrator import HGCOrchestrator
from revos_tools import RevOSTools


class TestHGCOrchestrator(unittest.TestCase):
    """Test suite for HGC Orchestrator"""

    def setUp(self):
        """Set up test fixtures"""
        self.mem0_key = "test-mem0-key"
        self.openai_key = "test-openai-key"
        self.api_base_url = "http://localhost:3000"
        self.auth_token = "test-auth-token"
        self.user_id = "test-user-123"
        self.pod_id = "test-pod-456"

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Agent')
    def test_orchestrator_initialization(self, mock_agent, mock_memory_client):
        """Test orchestrator initializes with correct dependencies"""
        orchestrator = HGCOrchestrator(
            mem0_key=self.mem0_key,
            openai_key=self.openai_key,
            api_base_url=self.api_base_url,
            auth_token=self.auth_token
        )

        # Verify memory client initialized
        mock_memory_client.assert_called_once_with(api_key=self.mem0_key)

        # Verify agent initialized with tools
        self.assertTrue(mock_agent.called)
        agent_kwargs = mock_agent.call_args[1]
        self.assertEqual(agent_kwargs['name'], "RevOS Intelligence")
        self.assertIn('tools', agent_kwargs)
        # Should have 2 memory tools + 6 RevOS tools = 8 total
        self.assertEqual(len(agent_kwargs['tools']), 8)

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Runner')
    @patch('orchestrator.Agent')
    def test_memory_key_scoping(self, mock_agent, mock_runner, mock_memory_client):
        """Test memory key uses pod::user format"""
        orchestrator = HGCOrchestrator(
            mem0_key=self.mem0_key,
            openai_key=self.openai_key,
            api_base_url=self.api_base_url,
            auth_token=self.auth_token
        )

        messages = [{"role": "user", "content": "Hello"}]

        # Mock runner
        mock_runner_instance = MagicMock()
        mock_runner.return_value = mock_runner_instance
        mock_runner_instance.run_sync.return_value = MagicMock(final_output="Test response")

        orchestrator.process(messages, self.user_id, self.pod_id)

        # Verify memory key set correctly
        expected_key = f"{self.pod_id}::{self.user_id}"
        self.assertEqual(orchestrator.current_memory_key, expected_key)

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Runner')
    @patch('orchestrator.Agent')
    def test_conversation_history_passed(self, mock_agent, mock_runner, mock_memory_client):
        """Test conversation history passed to agent context"""
        orchestrator = HGCOrchestrator(
            mem0_key=self.mem0_key,
            openai_key=self.openai_key,
            api_base_url=self.api_base_url,
            auth_token=self.auth_token
        )

        messages = [
            {"role": "user", "content": "What's my name?"},
            {"role": "assistant", "content": "I don't know yet."},
            {"role": "user", "content": "My name is Alice"}
        ]

        # Mock runner
        mock_runner_instance = MagicMock()
        mock_runner.return_value = mock_runner_instance
        mock_runner_instance.run_sync.return_value = MagicMock(final_output="Hi Alice!")

        orchestrator.process(messages, self.user_id, self.pod_id)

        # Verify runner.run_sync called with context
        call_kwargs = mock_runner_instance.run_sync.call_args[1]
        self.assertIn('context', call_kwargs)
        self.assertEqual(call_kwargs['context']['conversation_history'], messages)

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Runner')
    @patch('orchestrator.Agent')
    def test_error_handling(self, mock_agent, mock_runner, mock_memory_client):
        """Test error handling when agent fails"""
        orchestrator = HGCOrchestrator(
            mem0_key=self.mem0_key,
            openai_key=self.openai_key,
            api_base_url=self.api_base_url,
            auth_token=self.auth_token
        )

        messages = [{"role": "user", "content": "Hello"}]

        # Mock runner to raise exception
        mock_runner_instance = MagicMock()
        mock_runner.return_value = mock_runner_instance
        mock_runner_instance.run_sync.side_effect = Exception("Agent error")

        with self.assertRaises(Exception) as context:
            orchestrator.process(messages, self.user_id, self.pod_id)

        self.assertIn("Agent error", str(context.exception))


class TestMemoryTools(unittest.TestCase):
    """Test memory tool functionality"""

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Agent')
    def test_save_memory_tool(self, mock_agent, mock_memory_client):
        """Test save_memory stores with correct user_id"""
        orchestrator = HGCOrchestrator(
            mem0_key="test-key",
            openai_key="test-key",
            api_base_url="http://localhost:3000",
            auth_token="test-token"
        )

        # Set memory key
        orchestrator.current_memory_key = "pod-123::user-456"

        # Mock memory client
        mock_memory_instance = mock_memory_client.return_value
        mock_memory_instance.add.return_value = {"id": "mem-123"}

        # Get save_memory tool from agent
        agent_kwargs = mock_agent.call_args[1]
        tools = agent_kwargs['tools']
        save_memory = next(t for t in tools if hasattr(t, '__name__') and 'save_memory' in t.__name__)

        # Call save_memory
        result = save_memory("User prefers posting at 2pm EST")

        # Verify memory.add called with correct parameters
        mock_memory_instance.add.assert_called_once_with(
            "User prefers posting at 2pm EST",
            user_id="pod-123::user-456"
        )

        self.assertTrue(result['success'])
        self.assertEqual(result['saved'], "User prefers posting at 2pm EST")

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Agent')
    def test_search_memory_tool(self, mock_agent, mock_memory_client):
        """Test search_memory uses filters parameter"""
        orchestrator = HGCOrchestrator(
            mem0_key="test-key",
            openai_key="test-key",
            api_base_url="http://localhost:3000",
            auth_token="test-token"
        )

        # Set memory key
        orchestrator.current_memory_key = "pod-123::user-456"

        # Mock memory client
        mock_memory_instance = mock_memory_client.return_value
        mock_memory_instance.search.return_value = {
            'results': [
                {'content': 'User prefers posting at 2pm EST', 'score': 0.9}
            ]
        }

        # Get search_memory tool from agent
        agent_kwargs = mock_agent.call_args[1]
        tools = agent_kwargs['tools']
        search_memory = next(t for t in tools if hasattr(t, '__name__') and 'search_memory' in t.__name__)

        # Call search_memory
        result = search_memory("posting time")

        # Verify memory.search called with filters (not user_id)
        mock_memory_instance.search.assert_called_once_with(
            "posting time",
            filters={"user_id": "pod-123::user-456"},
            limit=5
        )

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['content'], 'User prefers posting at 2pm EST')

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Agent')
    def test_memory_isolation(self, mock_agent, mock_memory_client):
        """Test different users have isolated memories"""
        orchestrator = HGCOrchestrator(
            mem0_key="test-key",
            openai_key="test-key",
            api_base_url="http://localhost:3000",
            auth_token="test-token"
        )

        # Mock memory client
        mock_memory_instance = mock_memory_client.return_value
        mock_memory_instance.add.return_value = {"id": "mem-123"}

        # Get save_memory tool
        agent_kwargs = mock_agent.call_args[1]
        tools = agent_kwargs['tools']
        save_memory = next(t for t in tools if hasattr(t, '__name__') and 'save_memory' in t.__name__)

        # User 1 saves memory
        orchestrator.current_memory_key = "pod-123::user-1"
        save_memory("User 1 preference")

        call1 = mock_memory_instance.add.call_args_list[0]
        self.assertEqual(call1[1]['user_id'], "pod-123::user-1")

        # User 2 saves memory
        orchestrator.current_memory_key = "pod-123::user-2"
        save_memory("User 2 preference")

        call2 = mock_memory_instance.add.call_args_list[1]
        self.assertEqual(call2[1]['user_id'], "pod-123::user-2")

        # Different keys = isolated memories
        self.assertNotEqual(call1[1]['user_id'], call2[1]['user_id'])


class TestRevOSTools(unittest.TestCase):
    """Test RevOS tool integration"""

    def setUp(self):
        """Set up test fixtures"""
        self.api_base_url = "http://localhost:3000"
        self.auth_token = "test-auth-token"
        self.tools = RevOSTools(self.api_base_url, self.auth_token)

    def test_tools_initialization(self):
        """Test RevOS tools initialize correctly"""
        self.assertEqual(self.tools.api_base_url, self.api_base_url)
        self.assertEqual(self.tools.headers['Authorization'], f'Bearer {self.auth_token}')

    def test_get_all_tools_returns_six(self):
        """Test get_all_tools returns 6 tools"""
        all_tools = self.tools.get_all_tools()
        self.assertEqual(len(all_tools), 6)

    @patch('revos_tools.requests.get')
    def test_get_campaign_metrics(self, mock_get):
        """Test get_campaign_metrics calls correct endpoint"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "campaigns": [{"id": "camp-123", "name": "AI Leadership"}],
            "count": 1
        }
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        all_tools = self.tools.get_all_tools()
        get_campaign_metrics = all_tools[0]

        result = get_campaign_metrics("camp-123")

        mock_get.assert_called_once_with(
            "http://localhost:3000/api/hgc/campaigns?campaign_id=camp-123",
            headers=self.tools.headers,
            timeout=10
        )
        self.assertTrue(result['success'])
        self.assertEqual(result['count'], 1)

    @patch('revos_tools.requests.post')
    def test_create_campaign_draft_status(self, mock_post):
        """Test create_campaign always creates DRAFT status"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "campaign": {"id": "camp-new", "status": "draft"}
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        all_tools = self.tools.get_all_tools()
        create_campaign = next(t for t in all_tools if 'create_campaign' in t.__name__)

        result = create_campaign("AI Insights", "voice-123", "Test campaign")

        # Verify payload includes status: draft
        call_kwargs = mock_post.call_args
        payload = call_kwargs[1]['json']
        self.assertEqual(payload['status'], 'draft')
        self.assertTrue(result['success'])

    @patch('revos_tools.requests.post')
    def test_schedule_post_queued_status(self, mock_post):
        """Test schedule_post creates QUEUED status for safety"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "post": {"id": "post-new", "status": "queued"}
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        all_tools = self.tools.get_all_tools()
        schedule_post = next(t for t in all_tools if 'schedule_post' in t.__name__)

        result = schedule_post("Test post", "2025-11-10T14:00:00Z")

        # Verify payload includes status: queued
        call_kwargs = mock_post.call_args
        payload = call_kwargs[1]['json']
        self.assertEqual(payload['status'], 'queued')
        self.assertTrue(result['success'])


if __name__ == '__main__':
    unittest.main()
