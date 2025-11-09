"""
Holy Grail Chat - Core Orchestrator
MVP with tool-based integration (AgentKit + Mem0 + RevOS Data Tools)
"""

from agents import Agent, function_tool
from mem0 import MemoryClient
from typing import Optional, Dict, Any, List
import sys
import os
import threading

# Add tools directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from revos_tools import RevOSTools
from validation import InputValidator


class HGCOrchestrator:
    """Orchestrator connecting AgentKit + Mem0 + RevOS for complete intelligence"""

    def __init__(self, mem0_key: str, openai_key: str, api_base_url: str, auth_token: str):
        # Initialize memory client
        self.memory = MemoryClient(api_key=mem0_key)

        # Initialize RevOS data tools
        self.revos_tools = RevOSTools(api_base_url, auth_token)

        # Thread-local storage for memory key (prevents race conditions)
        self._memory_key_storage = threading.local()

    @property
    def current_memory_key(self) -> Optional[str]:
        """Get current memory key from thread-local storage"""
        return getattr(self._memory_key_storage, 'key', None)

    @current_memory_key.setter
    def current_memory_key(self, value: str) -> None:
        """Set current memory key in thread-local storage"""
        self._memory_key_storage.key = value

        # Define memory tools (agent decides when to use)
        # CRITICAL: Tools capture memory_key from orchestrator, NOT from agent parameters
        @function_tool
        def search_memory(query: str) -> list:
            """Search past conversations and stored memories.

            Args:
                query: What to search for (e.g., "posting time", "preferences")

            Returns:
                List of relevant memories
            """
            import sys
            print(f"[MEM0_TOOL] search_memory called: query='{query}', using memory_key='{self.current_memory_key}'", file=sys.stderr)

            if not self.current_memory_key:
                print(f"[MEM0_TOOL] ERROR: No memory_key set!", file=sys.stderr)
                return []

            try:
                # CRITICAL: Mem0 v2 API requires filters parameter, not user_id
                result = self.memory.search(
                    query,
                    filters={"user_id": self.current_memory_key},
                    limit=5
                )
                print(f"[MEM0_TOOL] search_memory returned: {result}", file=sys.stderr)
                # Extract results from response
                if isinstance(result, dict) and 'results' in result:
                    return result['results']
                return result
            except Exception as e:
                print(f"[MEM0_TOOL] search_memory error: {e}", file=sys.stderr)
                return []

        @function_tool
        def save_memory(content: str) -> dict:
            """Save important information for future reference.

            Args:
                content: What to remember (preferences, goals, important info)

            Returns:
                Confirmation of what was saved
            """
            import sys
            print(f"[MEM0_TOOL] save_memory called: content='{content[:100]}...', using memory_key='{self.current_memory_key}'", file=sys.stderr)

            if not self.current_memory_key:
                print(f"[MEM0_TOOL] ERROR: No memory_key set!", file=sys.stderr)
                return {"success": False, "error": "No memory key"}

            try:
                result = self.memory.add(content, user_id=self.current_memory_key)
                print(f"[MEM0_TOOL] save_memory returned: {result}", file=sys.stderr)
                return {"success": True, "saved": content, "result": result}
            except Exception as e:
                print(f"[MEM0_TOOL] save_memory error: {e}", file=sys.stderr)
                return {"success": False, "error": str(e)}

        # Collect all tools
        all_tools = [
            search_memory,
            save_memory,
            *self.revos_tools.get_all_tools()
        ]

        # Initialize agent with all tools
        self.agent = Agent(
            name="RevOS Intelligence",
            instructions="""You are RevOS Intelligence, an AI co-founder helping with LinkedIn growth strategy.

            CRITICAL MEMORY INSTRUCTIONS:
            1. You have access to conversation_history in context - check it FIRST before saying you don't know something
            2. When user shares preferences, goals, or important information → IMMEDIATELY call save_memory(content) for long-term storage
            3. When user asks about preferences from PREVIOUS conversations (not current chat) → call search_memory(query)
            4. For questions about the CURRENT conversation → use conversation_history, NOT search_memory
            5. Memory is automatically scoped to the current user - you don't need to provide user_id

            AVAILABLE TOOLS:
            Memory:
            - search_memory(query) - Search past conversations. Example: search_memory("posting time")
            - save_memory(content) - Store important info. Example: save_memory("User prefers posting at 2pm EST")

            Campaign Data:
            - get_campaign_metrics(campaign_id) - View campaign performance
            - analyze_campaign_performance(campaign_id) - Deep analytics with recommendations
            - create_campaign(name, voice_id, description) - Create DRAFT campaign (safe)

            Pod & Performance:
            - analyze_pod_engagement(pod_id) - Pod performance metrics
            - get_linkedin_performance(date_range) - LinkedIn metrics over time

            Posting:
            - schedule_post(content, schedule_time, campaign_id) - Queue post for review (safe)

            WORKFLOW:
            1. User shares preference → save_memory() immediately
            2. User asks question → search_memory() first, then answer
            3. Provide specific, actionable advice based on real data

            Be helpful, remember everything, and use tools proactively.""",
            tools=all_tools,
            model="gpt-4"
        )

    def process(self, messages: List[Dict[str, str]], user_id: str, pod_id: str) -> str:
        """Process conversation with full message history.

        Args:
            messages: List of conversation messages with 'role' and 'content' keys
            user_id: Unique identifier for the user
            pod_id: Identifier for the user's engagement pod

        Returns:
            Agent's response text

        Raises:
            ValueError: If input validation fails
        """
        import sys
        from agents import Runner

        # Validate inputs
        valid, error = InputValidator.validate_messages(messages)
        if not valid:
            print(f"[ORCHESTRATOR] Input validation failed: {error}", file=sys.stderr)
            raise ValueError(f"Invalid messages: {error}")

        valid, error = InputValidator.validate_user_id(user_id)
        if not valid:
            print(f"[ORCHESTRATOR] User ID validation failed: {error}", file=sys.stderr)
            raise ValueError(f"Invalid user_id: {error}")

        valid, error = InputValidator.validate_pod_id(pod_id)
        if not valid:
            print(f"[ORCHESTRATOR] Pod ID validation failed: {error}", file=sys.stderr)
            raise ValueError(f"Invalid pod_id: {error}")

        # Format memory key (pod::user scoping)
        memory_key = f"{pod_id}::{user_id}"

        # CRITICAL: Set memory key so tools can access it
        self.current_memory_key = memory_key

        print(f"[ORCHESTRATOR] Processing {len(messages)} messages", file=sys.stderr)
        print(f"[ORCHESTRATOR] Memory key: {memory_key}", file=sys.stderr)

        # Convert frontend messages to AgentKit format
        # Frontend: [{"role": "user"|"assistant", "content": "..."}]
        # AgentKit: expects list of messages for context

        # For now, just pass the last user message as input
        # The agent will use memory tools to recall context
        last_user_message = None
        for msg in reversed(messages):
            if msg.get('role') == 'user':
                last_user_message = msg.get('content', '')
                break

        if not last_user_message:
            return "I didn't receive a message. Please try again."

        # Sanitize user input
        last_user_message = InputValidator.sanitize_message(last_user_message)

        print(f"[ORCHESTRATOR] Last user message: '{last_user_message[:100]}'", file=sys.stderr)

        try:
            # Create runner and run agent
            runner = Runner()
            print(f"[ORCHESTRATOR] Running agent...", file=sys.stderr)
            result = runner.run_sync(
                starting_agent=self.agent,
                input=last_user_message,
                context={"user_id": memory_key, "conversation_history": messages}
            )
            print(f"[ORCHESTRATOR] Agent completed", file=sys.stderr)

            # Extract text from result
            if hasattr(result, 'final_output'):
                response = result.final_output
            elif hasattr(result, 'content'):
                response = result.content
            else:
                # Fallback: convert result to string
                response = str(result)

            print(f"[ORCHESTRATOR] Response: '{response[:100]}...'", file=sys.stderr)
            return response
        except Exception as e:
            print(f"[ORCHESTRATOR] Error: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            raise
