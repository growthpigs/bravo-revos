"""
Holy Grail Chat - Core Orchestrator
MVP with tool-based integration (AgentKit + Mem0 + RevOS Data Tools)
"""

from openai_agents import Agent, function_tool
from mem0 import MemoryClient
from typing import Optional, Dict, Any
import sys
import os

# Add tools directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from revos_tools import RevOSTools


class HGCOrchestrator:
    """Orchestrator connecting AgentKit + Mem0 + RevOS for complete intelligence"""

    def __init__(self, mem0_key: str, openai_key: str, api_base_url: str, auth_token: str):
        # Initialize memory client
        self.memory = MemoryClient(api_key=mem0_key)

        # Initialize RevOS data tools
        self.revos_tools = RevOSTools(api_base_url, auth_token)

        # Define memory tools (agent decides when to use)
        @function_tool
        def search_memory(query: str, user_id: str) -> list:
            """Search past conversations and stored memories"""
            return self.memory.search(query, user_id=user_id, limit=5)

        @function_tool
        def save_memory(content: str, user_id: str) -> dict:
            """Save important information for future reference"""
            return self.memory.add(content, user_id=user_id)

        # Collect all tools
        all_tools = [
            search_memory,
            save_memory,
            *self.revos_tools.get_all_tools()
        ]

        # Initialize agent with all tools
        self.agent = Agent(
            name="RevOS Intelligence",
            instructions="""You are an AI co-founder helping with LinkedIn growth strategy.

            You have access to:
            - Memory tools: search_memory, save_memory
            - Campaign tools: get_campaign_metrics
            - Pod tools: analyze_pod_engagement
            - Performance tools: get_linkedin_performance

            Use search_memory to recall previous discussions.
            Use save_memory to store goals, preferences, and insights.
            Use campaign/pod/performance tools to answer questions about user's LinkedIn strategy.

            Always provide specific, actionable advice based on real data.""",
            tools=all_tools,
            model="gpt-4"
        )

    def process(self, message: str, user_id: str, pod_id: str) -> str:
        """Process user message with memory context"""
        # Format memory key (pod::user scoping)
        memory_key = f"{pod_id}::{user_id}"

        # Run agent (it decides when to use memory tools)
        response = self.agent.run(
            messages=[{"role": "user", "content": message}],
            context={"user_id": memory_key}
        )

        return response.content
