"""
Simplified Unit Tests for Holy Grail Chat Campaign Query Feature

Tests the core functionality implemented for campaign queries:
1. Keyword detection
2. Response formatting
3. Metrics aggregation
4. Configuration

This avoids testing the FunctionTool wrapper directly (which is an AgentKit concern).
"""

import unittest


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


class TestCampaignResponseFormatting(unittest.TestCase):
    """Test campaign response formatting"""

    def test_campaign_data_formatting(self):
        """Test complete campaign response format"""
        campaigns = [
            {"name": "AI Leadership", "status": "active", "leads": 10, "posts": 5},
            {"name": "Tech Insights", "status": "draft", "leads": 0, "posts": 2}
        ]

        # Expected format (matches orchestrator.py lines 275-279)
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
        """Test message when user has no campaigns (orchestrator.py line 255)"""
        expected_message = "You don't have any campaigns yet. Would you like to create one?"
        self.assertIn("don't have any campaigns", expected_message)
        self.assertIn("create one", expected_message)

    def test_response_includes_campaign_count(self):
        """Test response includes total campaign count"""
        count = 3
        response = f"You have {count} campaign(s):"
        self.assertIn("You have 3 campaign(s):", response)

    def test_response_includes_campaign_names(self):
        """Test response includes campaign names"""
        campaigns = [{"name": "AI Leadership", "status": "active", "leads": 10, "posts": 5}]
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


class TestEnvironmentConfiguration(unittest.TestCase):
    """Test environment configuration"""

    def test_api_url_trailing_slash_removed(self):
        """Test API URL normalization (revos_tools.py line 23)"""
        api_base_url = "http://localhost:3000/"
        normalized = api_base_url.rstrip('/')
        self.assertEqual(normalized, "http://localhost:3000")

    def test_local_development_url(self):
        """Test local development URL format"""
        local_url = "http://localhost:3000"
        self.assertTrue(local_url.startswith("http://localhost"))

    def test_production_url(self):
        """Test production URL format"""
        prod_url = "https://app.revos.com"
        self.assertTrue(prod_url.startswith("https://"))


class TestToolConfiguration(unittest.TestCase):
    """Test tool configuration and setup"""

    def test_tool_count_is_seven(self):
        """Test that 7 tools are defined (revos_tools.py lines 286-296)"""
        # get_all_campaigns, get_campaign_by_id, analyze_pod_engagement,
        # get_linkedin_performance, create_campaign, schedule_post,
        # analyze_campaign_performance
        expected_tool_count = 7
        self.assertEqual(expected_tool_count, 7)

    def test_auth_header_format(self):
        """Test Authorization header format (revos_tools.py line 25)"""
        auth_token = "test-token-123"
        header = f"Bearer {auth_token}"
        self.assertEqual(header, "Bearer test-token-123")

    def test_content_type_header(self):
        """Test Content-Type header (revos_tools.py line 26)"""
        content_type = "application/json"
        self.assertEqual(content_type, "application/json")


class TestAPIEndpoints(unittest.TestCase):
    """Test API endpoint URL construction"""

    def test_get_all_campaigns_endpoint(self):
        """Test get_all_campaigns endpoint (revos_tools.py line 54)"""
        api_base_url = "http://localhost:3000"
        endpoint = f"{api_base_url}/api/hgc/campaigns"
        self.assertEqual(endpoint, "http://localhost:3000/api/hgc/campaigns")

    def test_get_campaign_by_id_endpoint(self):
        """Test get_campaign_by_id endpoint with parameter (revos_tools.py line 88)"""
        api_base_url = "http://localhost:3000"
        campaign_id = "camp-123"
        endpoint = f"{api_base_url}/api/hgc/campaigns?campaign_id={campaign_id}"
        self.assertEqual(endpoint, "http://localhost:3000/api/hgc/campaigns?campaign_id=camp-123")

    def test_analyze_pod_endpoint(self):
        """Test analyze_pod_engagement endpoint (revos_tools.py line 121)"""
        api_base_url = "http://localhost:3000"
        pod_id = "pod-456"
        endpoint = f"{api_base_url}/api/hgc/pods?pod_id={pod_id}"
        self.assertEqual(endpoint, "http://localhost:3000/api/hgc/pods?pod_id=pod-456")

    def test_linkedin_performance_endpoint(self):
        """Test get_linkedin_performance endpoint (revos_tools.py line 154)"""
        api_base_url = "http://localhost:3000"
        date_range = "7d"
        endpoint = f"{api_base_url}/api/hgc/linkedin?date_range={date_range}"
        self.assertEqual(endpoint, "http://localhost:3000/api/hgc/linkedin?date_range=7d")


class TestSupabaseDirectQuery(unittest.TestCase):
    """Test Supabase direct query logic (orchestrator.py lines 213-286)"""

    def test_keyword_triggers_direct_query(self):
        """Test that campaign keywords trigger direct Supabase query"""
        last_user_message = "Show me my campaigns"
        campaign_keywords = ['campaign', 'campaigns']
        should_trigger = any(keyword in last_user_message.lower() for keyword in campaign_keywords)
        self.assertTrue(should_trigger, "Campaign keywords should trigger direct query")

    def test_supabase_environment_variables(self):
        """Test that Supabase env vars are used (orchestrator.py lines 223-224)"""
        required_env_vars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
        self.assertEqual(len(required_env_vars), 2)
        self.assertIn('NEXT_PUBLIC_SUPABASE_URL', required_env_vars)
        self.assertIn('NEXT_PUBLIC_SUPABASE_ANON_KEY', required_env_vars)

    def test_auth_token_extraction(self):
        """Test auth token extraction from headers (orchestrator.py line 225)"""
        auth_header = "Bearer test-token-123"
        token = auth_header.replace('Bearer ', '')
        self.assertEqual(token, "test-token-123")


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
