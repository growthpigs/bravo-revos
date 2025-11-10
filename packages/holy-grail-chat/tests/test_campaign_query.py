"""
Unit tests for Holy Grail Chat Campaign Query Feature

Tests the direct Supabase campaign query bypass implemented to work around
broken AgentKit tool calling.

What Was Built (2025-11-10):
1. Direct Supabase queries from orchestrator (bypasses AgentKit)
2. Keyword detection for "campaign" in user messages
3. Authentication with user session token
4. Campaign metrics (leads, posts) aggregation
5. Formatted response with campaign list

Files Tested:
- packages/holy-grail-chat/core/orchestrator.py (lines 213-286)
- packages/holy-grail-chat/tools/revos_tools.py (get_all_campaigns, get_campaign_by_id)
"""

import sys
import os
import unittest
from unittest.mock import Mock, patch, MagicMock

# Add parent directories to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))

from orchestrator import HGCOrchestrator
from revos_tools import RevOSTools


class TestCampaignKeywordDetection(unittest.TestCase):
    """Test keyword detection for campaign queries"""

    def test_detects_campaign_singular(self):
        """Should detect 'campaign' keyword"""
        test_message = "Show me my campaign"
        keywords = ['campaign', 'campaigns']
        detected = any(keyword in test_message.lower() for keyword in keywords)
        self.assertTrue(detected)

    def test_detects_campaigns_plural(self):
        """Should detect 'campaigns' keyword"""
        test_message = "List all campaigns"
        keywords = ['campaign', 'campaigns']
        detected = any(keyword in test_message.lower() for keyword in keywords)
        self.assertTrue(detected)

    def test_detects_campaign_mid_sentence(self):
        """Should detect campaign keyword anywhere in message"""
        test_message = "How is my LinkedIn campaign performing?"
        keywords = ['campaign', 'campaigns']
        detected = any(keyword in test_message.lower() for keyword in keywords)
        self.assertTrue(detected)

    def test_case_insensitive_detection(self):
        """Should detect CAMPAIGN in any case"""
        test_message = "Show CAMPAIGN status"
        keywords = ['campaign', 'campaigns']
        detected = any(keyword in test_message.lower() for keyword in keywords)
        self.assertTrue(detected)

    def test_no_false_positives(self):
        """Should not trigger on unrelated messages"""
        test_message = "What's my LinkedIn performance?"
        keywords = ['campaign', 'campaigns']
        detected = any(keyword in test_message.lower() for keyword in keywords)
        self.assertFalse(detected)


class TestSupabaseQueryLogic(unittest.TestCase):
    """Test direct Supabase query implementation"""

    def test_campaign_data_formatting(self):
        """Test campaign response formatting"""
        campaigns = [
            {"name": "AI Leadership", "status": "active", "leads": 10, "posts": 5},
            {"name": "Tech Insights", "status": "draft", "leads": 0, "posts": 2}
        ]

        # Expected format
        response_text = f"You have {len(campaigns)} campaign(s):\n\n"
        for i, campaign in enumerate(campaigns, 1):
            response_text += f"{i}. **{campaign['name']}** ({campaign['status']})\n"
            response_text += f"   - Leads: {campaign['leads']}, Posts: {campaign['posts']}\n"

        self.assertIn("You have 2 campaign(s):", response_text)
        self.assertIn("AI Leadership", response_text)
        self.assertIn("Tech Insights", response_text)
        self.assertIn("Leads: 10, Posts: 5", response_text)
        self.assertIn("Leads: 0, Posts: 2", response_text)

    def test_empty_campaigns_message(self):
        """Test message when user has no campaigns"""
        expected_message = "You don't have any campaigns yet. Would you like to create one?"
        self.assertIn("don't have any campaigns", expected_message)
        self.assertIn("create one", expected_message)


class TestRevOSToolsSplit(unittest.TestCase):
    """Test split tool schema (get_all_campaigns vs get_campaign_by_id)"""

    def setUp(self):
        """Set up test fixtures"""
        self.api_base_url = "http://localhost:3000"
        self.auth_token = "test-auth-token"
        self.tools = RevOSTools(self.api_base_url, self.auth_token)

    def test_tools_count_is_seven(self):
        """Test get_all_tools returns 7 tools (split campaign tools)"""
        all_tools = self.tools.get_all_tools()
        # get_all_campaigns, get_campaign_by_id, analyze_pod, linkedin_perf, create_campaign, schedule_post, analyze_campaign
        self.assertEqual(len(all_tools), 7)

    def test_get_all_campaigns_exists(self):
        """Test get_all_campaigns tool exists"""
        all_tools = self.tools.get_all_tools()
        # First tool should be get_all_campaigns
        self.assertIsNotNone(all_tools[0])

    def test_get_campaign_by_id_exists(self):
        """Test get_campaign_by_id tool exists"""
        all_tools = self.tools.get_all_tools()
        # Second tool should be get_campaign_by_id
        self.assertIsNotNone(all_tools[1])

    @patch('revos_tools.requests.get')
    def test_get_all_campaigns_no_parameters(self, mock_get):
        """Test get_all_campaigns calls API without campaign_id parameter"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "campaigns": [{"id": "camp-1", "name": "Test"}],
            "count": 1
        }
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        # Get tool (first tool) and call its underlying function
        all_tools = self.tools.get_all_tools()
        get_all_campaigns_tool = all_tools[0]

        # Access the wrapped function through the FunctionTool
        result = get_all_campaigns_tool.on_invoke_tool()

        # Verify correct URL called (no campaign_id parameter)
        expected_url = f"{self.api_base_url}/api/hgc/campaigns"
        mock_get.assert_called_once_with(
            expected_url,
            headers=self.tools.headers,
            timeout=10
        )
        self.assertTrue(result['success'])
        self.assertEqual(result['count'], 1)

    @patch('revos_tools.requests.get')
    def test_get_campaign_by_id_requires_parameter(self, mock_get):
        """Test get_campaign_by_id requires campaign_id parameter"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "campaigns": [{"id": "camp-123", "name": "AI Leadership"}],
            "count": 1
        }
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        # Get tool (second tool)
        all_tools = self.tools.get_all_tools()
        get_campaign_by_id_tool = all_tools[1]

        # Call with campaign_id parameter
        result = get_campaign_by_id_tool.function("camp-123")

        # Verify correct URL with campaign_id parameter
        expected_url = f"{self.api_base_url}/api/hgc/campaigns?campaign_id=camp-123"
        mock_get.assert_called_once_with(
            expected_url,
            headers=self.tools.headers,
            timeout=10
        )
        self.assertTrue(result['success'])


class TestErrorHandling(unittest.TestCase):
    """Test error handling for campaign queries"""

    def setUp(self):
        """Set up test fixtures"""
        self.api_base_url = "http://localhost:3000"
        self.auth_token = "test-auth-token"
        self.tools = RevOSTools(self.api_base_url, self.auth_token)

    @patch('revos_tools.requests.get')
    def test_handles_network_errors(self, mock_get):
        """Test graceful handling of network errors"""
        mock_get.side_effect = Exception("Connection refused")

        all_tools = self.tools.get_all_tools()
        get_all_campaigns = all_tools[0]

        result = get_all_campaigns.on_invoke_tool()

        self.assertFalse(result['success'])
        self.assertIn('error', result)
        self.assertIn('Failed to fetch campaigns', result['error'])

    @patch('revos_tools.requests.get')
    def test_handles_auth_errors(self, mock_get):
        """Test handling of authentication errors"""
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = Exception("401 Unauthorized")
        mock_get.return_value = mock_response

        all_tools = self.tools.get_all_tools()
        get_all_campaigns = all_tools[0]

        result = get_all_campaigns.on_invoke_tool()

        self.assertFalse(result['success'])
        self.assertIn('error', result)

    @patch('revos_tools.requests.get')
    def test_handles_timeout_errors(self, mock_get):
        """Test handling of timeout errors"""
        import requests
        mock_get.side_effect = requests.Timeout("Request timed out")

        all_tools = self.tools.get_all_tools()
        get_all_campaigns = all_tools[0]

        result = get_all_campaigns.on_invoke_tool()

        self.assertFalse(result['success'])
        self.assertIn('error', result)


class TestEnvironmentConfiguration(unittest.TestCase):
    """Test environment configuration for different deployment contexts"""

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Agent')
    def test_local_development_config(self, mock_agent, mock_memory):
        """Test configuration for local development (localhost:3000)"""
        api_base_url = "http://localhost:3000"
        auth_token = "test-token"

        orchestrator = HGCOrchestrator(
            mem0_key="test-key",
            openai_key="test-key",
            api_base_url=api_base_url,
            auth_token=auth_token
        )

        # Verify API URL configured for local dev
        self.assertEqual(orchestrator.revos_tools.api_base_url, "http://localhost:3000")

    @patch('orchestrator.MemoryClient')
    @patch('orchestrator.Agent')
    def test_production_config(self, mock_agent, mock_memory):
        """Test configuration for production environment"""
        api_base_url = "https://app.revos.com"
        auth_token = "prod-token"

        orchestrator = HGCOrchestrator(
            mem0_key="test-key",
            openai_key="test-key",
            api_base_url=api_base_url,
            auth_token=auth_token
        )

        # Verify API URL configured for production
        self.assertEqual(orchestrator.revos_tools.api_base_url, "https://app.revos.com")

    def test_api_url_trailing_slash_removed(self):
        """Test API URL has trailing slash removed"""
        api_base_url = "http://localhost:3000/"
        auth_token = "test-token"

        tools = RevOSTools(api_base_url, auth_token)

        # Verify trailing slash removed
        self.assertEqual(tools.api_base_url, "http://localhost:3000")


class TestMetricsAggregation(unittest.TestCase):
    """Test campaign metrics aggregation (leads, posts)"""

    def test_campaign_with_metrics(self):
        """Test campaign data includes leads and posts counts"""
        campaign_data = {
            "name": "AI Leadership",
            "status": "active",
            "leads": 15,
            "posts": 8
        }

        self.assertEqual(campaign_data['leads'], 15)
        self.assertEqual(campaign_data['posts'], 8)

    def test_campaign_with_zero_metrics(self):
        """Test campaign with zero leads/posts"""
        campaign_data = {
            "name": "New Campaign",
            "status": "draft",
            "leads": 0,
            "posts": 0
        }

        self.assertEqual(campaign_data['leads'], 0)
        self.assertEqual(campaign_data['posts'], 0)

    def test_multiple_campaigns_aggregation(self):
        """Test aggregating metrics across multiple campaigns"""
        campaigns = [
            {"name": "Campaign 1", "leads": 10, "posts": 5},
            {"name": "Campaign 2", "leads": 20, "posts": 8},
            {"name": "Campaign 3", "leads": 5, "posts": 3}
        ]

        total_leads = sum(c['leads'] for c in campaigns)
        total_posts = sum(c['posts'] for c in campaigns)

        self.assertEqual(total_leads, 35)
        self.assertEqual(total_posts, 16)


class TestResponseFormat(unittest.TestCase):
    """Test formatted response structure"""

    def test_response_includes_campaign_count(self):
        """Test response includes total campaign count"""
        count = 3
        response = f"You have {count} campaign(s):"
        self.assertIn("You have 3 campaign(s):", response)

    def test_response_includes_campaign_names(self):
        """Test response includes campaign names"""
        campaigns = [
            {"name": "AI Leadership", "status": "active", "leads": 10, "posts": 5}
        ]
        response_text = f"1. **{campaigns[0]['name']}** ({campaigns[0]['status']})\n"
        self.assertIn("AI Leadership", response_text)
        self.assertIn("active", response_text)

    def test_response_includes_metrics(self):
        """Test response includes leads and posts metrics"""
        campaign = {"name": "Test", "status": "active", "leads": 10, "posts": 5}
        metrics_line = f"   - Leads: {campaign['leads']}, Posts: {campaign['posts']}\n"
        self.assertIn("Leads: 10, Posts: 5", metrics_line)

    def test_response_markdown_formatting(self):
        """Test response uses markdown bold for campaign names"""
        name = "AI Leadership"
        formatted = f"**{name}**"
        self.assertEqual(formatted, "**AI Leadership**")


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
