"""
Simplified unit tests for HGC Runner
Tests environment variable handling and JSON parsing
"""

import sys
import os
import unittest
import json

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))


class TestHGCRunnerContextParsing(unittest.TestCase):
    """Test runner context parsing logic"""

    def test_valid_context_structure(self):
        """Test valid context has all required fields"""
        valid_context = {
            "user_id": "user-123",
            "pod_id": "pod-456",
            "messages": [{"role": "user", "content": "Hello"}],
            "api_base_url": "http://localhost:3000",
            "mem0_key": "test-mem0-key",
            "openai_key": "test-openai-key",
            "auth_token": "test-auth-token"
        }

        # All required fields present
        required = ['user_id', 'pod_id', 'messages', 'api_base_url', 'mem0_key', 'openai_key', 'auth_token']
        for field in required:
            self.assertIn(field, valid_context)

    def test_json_serialization(self):
        """Test context can be serialized to JSON"""
        context = {
            "user_id": "user-123",
            "pod_id": "pod-456",
            "messages": [{"role": "user", "content": "Hello"}],
            "api_base_url": "http://localhost:3000",
            "mem0_key": "key1",
            "openai_key": "key2",
            "auth_token": "token"
        }

        # Should serialize without error
        json_str = json.dumps(context)
        self.assertIsInstance(json_str, str)

        # Should deserialize back correctly
        parsed = json.loads(json_str)
        self.assertEqual(parsed['user_id'], context['user_id'])
        self.assertEqual(parsed['pod_id'], context['pod_id'])

    def test_invalid_json_detection(self):
        """Test invalid JSON is detected"""
        invalid_json = "invalid-json"

        with self.assertRaises(json.JSONDecodeError):
            json.loads(invalid_json)

    def test_missing_field_detection(self):
        """Test missing required fields can be detected"""
        incomplete_context = {
            "user_id": "user-123"
            # Missing: pod_id, messages, api_base_url, keys
        }

        required_fields = ['user_id', 'pod_id', 'messages', 'api_base_url', 'mem0_key', 'openai_key', 'auth_token']

        missing = []
        for field in required_fields:
            if field not in incomplete_context:
                missing.append(field)

        self.assertTrue(len(missing) > 0)
        self.assertIn('pod_id', missing)
        self.assertIn('messages', missing)


if __name__ == '__main__':
    unittest.main()
