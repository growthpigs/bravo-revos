#!/usr/bin/env python3
"""
HGC Runner - Subprocess wrapper for orchestrator
Called by Next.js API route with context in environment variable

Requirements:
- Python 3.10+ (for union type syntax in agents library)
- Dependencies: mem0ai, agents (openai-agents), requests
"""

import os
import json
import sys

# Verify Python version (require 3.10+ for union type syntax)
if sys.version_info < (3, 10):
    error = {
        'error': f'Python 3.10+ required, found {sys.version_info.major}.{sys.version_info.minor}',
        'type': 'PythonVersionError'
    }
    print(json.dumps(error), file=sys.stderr)
    sys.exit(1)

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from orchestrator import HGCOrchestrator


def main():
    """Main runner function"""
    try:
        # Read context from environment
        context_json = os.environ.get('HGC_CONTEXT')
        if not context_json:
            raise ValueError('HGC_CONTEXT environment variable not set')

        context = json.loads(context_json)

        # Extract required fields
        user_id = context['user_id']
        pod_id = context['pod_id']
        messages = context.get('messages', [])
        api_base_url = context['api_base_url']
        mem0_key = context['mem0_key']
        openai_key = context['openai_key']
        auth_token = context['auth_token']

        # Validate required fields
        if not all([user_id, pod_id, messages, api_base_url, mem0_key, openai_key, auth_token]):
            raise ValueError('Missing required context fields')

        # Initialize orchestrator
        orchestrator = HGCOrchestrator(
            mem0_key=mem0_key,
            openai_key=openai_key,
            api_base_url=api_base_url,
            auth_token=auth_token
        )

        # Process conversation with full history
        response_content = orchestrator.process(
            messages=messages,
            user_id=user_id,
            pod_id=pod_id
        )

        # Return result as JSON
        result = {
            'content': response_content,
            'memory_stored': True,  # Assume memory tools were available
        }

        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        # Return error as JSON to stderr
        error_result = {
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
