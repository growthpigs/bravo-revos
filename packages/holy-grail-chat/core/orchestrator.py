"""
Holy Grail Chat - Core Orchestrator
MVP with tool-based integration (AgentKit + Mem0 + RevOS Data Tools)
"""

from agents import Agent, function_tool
from mem0 import MemoryClient
from typing import Optional, Dict, Any, List, Tuple
import sys
import os
import threading
from supabase import create_client, Client

# Add tools directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from revos_tools import RevOSTools
from validation import InputValidator

# Constants for direct query bypass patterns
CAMPAIGN_KEYWORDS = ['campaign', 'campaigns']


class HGCOrchestrator:
    """Orchestrator connecting AgentKit + Mem0 + RevOS for complete intelligence"""

    def __init__(self, mem0_key: str, openai_key: str, api_base_url: str, auth_token: str):
        # Initialize memory client
        self.memory = MemoryClient(api_key=mem0_key)

        # Initialize RevOS data tools
        self.revos_tools = RevOSTools(api_base_url, auth_token)

        # Thread-local storage for memory key (prevents race conditions)
        self._memory_key_storage = threading.local()

        # Cache for Supabase client (avoid recreation on every request)
        self._supabase_client: Optional[Client] = None

    def _get_supabase_client(self, auth_token: str) -> Client:
        """
        Get or create Supabase client with authentication.

        Args:
            auth_token: User's session JWT token

        Returns:
            Authenticated Supabase client
        """
        supabase_url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
        supabase_key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

        # Create client with anon key
        client = create_client(supabase_url, supabase_key)

        # Set Authorization header with user's JWT token for authenticated queries
        # This allows RLS policies to see auth.uid() correctly
        client.postgrest.auth(auth_token)

        return client

    def _get_user_context(self, supabase: Client, auth_token: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Get user ID and client ID from authenticated session.

        Args:
            supabase: Authenticated Supabase client
            auth_token: User's session token

        Returns:
            Tuple of (user_id, client_id) or (None, None) if authentication fails
        """
        try:
            # Get user info
            user_response = supabase.auth.get_user(auth_token)
            if not user_response or not user_response.user:
                return None, None

            user_id = user_response.user.id

            # Get user's client_id
            user_data = supabase.table('users').select('client_id').eq('id', user_id).maybe_single().execute()
            if not user_data.data:
                return user_id, None

            client_id = user_data.data.get('client_id')
            return user_id, client_id
        except Exception as e:
            print(f"[ORCHESTRATOR] User context retrieval failed: {e}", file=sys.stderr)
            return None, None

    def _fetch_campaigns_with_metrics(self, supabase: Client, client_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all campaigns for a client with associated metrics.

        Args:
            supabase: Authenticated Supabase client
            client_id: Client UUID to filter campaigns

        Returns:
            List of campaigns with leads and posts counts
        """
        # Query campaigns
        campaigns_response = supabase.table('campaigns').select(
            'id, name, description, status, created_at'
        ).eq('client_id', client_id).execute()

        campaigns = campaigns_response.data if campaigns_response.data else []

        # Get metrics for each campaign
        campaigns_with_metrics = []
        for campaign in campaigns:
            # Count leads
            leads_response = supabase.table('leads').select('*', count='exact').eq(
                'campaign_id', campaign['id']
            ).execute()
            leads_count = leads_response.count if leads_response.count else 0

            # Count posts
            posts_response = supabase.table('posts').select('*', count='exact').eq(
                'campaign_id', campaign['id']
            ).execute()
            posts_count = posts_response.count if posts_response.count else 0

            campaigns_with_metrics.append({
                'name': campaign.get('name', 'Unnamed'),
                'status': campaign.get('status', 'unknown'),
                'leads': leads_count,
                'posts': posts_count
            })

        return campaigns_with_metrics

    def _format_campaigns_response(self, campaigns: List[Dict[str, Any]]) -> str:
        """
        Format campaigns data as user-friendly markdown.

        Args:
            campaigns: List of campaigns with metrics

        Returns:
            Formatted markdown string
        """
        if len(campaigns) == 0:
            return "You don't have any campaigns yet. Would you like to create one?"

        response_text = f"You have {len(campaigns)} campaign(s):\n\n"
        for i, campaign in enumerate(campaigns, 1):
            response_text += f"{i}. **{campaign['name']}** ({campaign['status']})\n"
            response_text += f"   - Leads: {campaign['leads']}, Posts: {campaign['posts']}\n"

        return response_text

    def _handle_campaign_query(self, auth_token: str) -> str:
        """
        Handle campaign-related queries with direct Supabase access.

        This bypasses the broken AgentKit tool calling system and directly
        queries campaign data with metrics.

        Args:
            auth_token: User's Bearer token from session

        Returns:
            Formatted response with campaign information or error message
        """
        try:
            # Create authenticated Supabase client
            supabase = self._get_supabase_client(auth_token)

            # Get user context
            user_id, client_id = self._get_user_context(supabase, auth_token)
            if not user_id:
                return "I couldn't authenticate your session. Please refresh the page and try again."
            if not client_id:
                return "I couldn't find your account information. Please contact support."

            print(f"[ORCHESTRATOR] Fetching campaigns for user {user_id}, client {client_id}", file=sys.stderr)

            # Fetch campaigns with metrics
            campaigns = self._fetch_campaigns_with_metrics(supabase, client_id)

            print(f"[ORCHESTRATOR] Found {len(campaigns)} campaigns", file=sys.stderr)

            # Format and return response
            return self._format_campaigns_response(campaigns)

        except Exception as e:
            print(f"[ORCHESTRATOR] Campaign query failed: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return "I encountered an issue while fetching your campaigns. Please try again or contact support if the problem persists."

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

        # Collect all tools upfront (lazy loading added overhead, not savings)
        all_tools = [search_memory, save_memory] + self.revos_tools.get_all_tools()

        # Initialize agent with all tools
        self.agent = Agent(
            name="RevOS Intelligence",
            instructions="""You are RevOS Intelligence, helping with LinkedIn growth and campaign management.

            🎯 TOOL SELECTION RULES (FOLLOW EXACTLY):

            When user asks about CAMPAIGNS/BUSINESS DATA:
            → ALWAYS use business tools, NOT memory
            - "show me campaigns" / "list campaigns" → get_all_campaigns()
            - "how is campaign X doing?" → get_campaign_by_id(campaign_id="...")
            - "pod performance" → analyze_pod_engagement(pod_id)
            - "LinkedIn stats" → get_linkedin_performance()

            When user asks about PERSONAL PREFERENCES:
            → ALWAYS use search_memory() or save_memory()
            - "what's my favorite X?" → search_memory("favorite X")
            - "remember my X is Y" → save_memory("User's X is Y")
            - "what's my goal?" → search_memory("goal")

            🔧 YOUR TOOLS:

            BUSINESS DATA (campaigns, pods, LinkedIn):
            - get_all_campaigns() - Get ALL user campaigns (NO parameters)
            - get_campaign_by_id(campaign_id) - Get ONE specific campaign (ID required)
            - analyze_campaign_performance(campaign_id) - Deep campaign analytics
            - analyze_pod_engagement(pod_id) - Pod metrics
            - get_linkedin_performance(date_range) - LinkedIn stats
            - create_campaign(name, voice_id, description) - Create DRAFT
            - schedule_post(content, time, campaign_id) - Queue post

            MEMORY (user preferences only):
            - search_memory(query) - Find user preferences
            - save_memory(content) - Store user info

            ⚡ IMPORTANT:
            1. ALWAYS call the appropriate tool - NEVER respond without using tools
            2. Campaigns = database, NOT memory
            3. Preferences = memory, NOT database
            4. Use tools PROACTIVELY - don't apologize, call the tool!

            Be helpful and ALWAYS use your tools to fetch real data.""",
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

        # CRITICAL FIX: Agent stopped calling ALL tools (AgentKit bug)
        # Force direct tool execution for known patterns to bypass broken agent
        if any(keyword in last_user_message.lower() for keyword in CAMPAIGN_KEYWORDS):
            print(f"[ORCHESTRATOR] FORCING direct tool call (agent broken)", file=sys.stderr)
            # Extract auth token and handle campaign query
            auth_token = self.revos_tools.headers.get('Authorization', '').replace('Bearer ', '')
            return self._handle_campaign_query(auth_token)

        try:
            # Create runner and run agent
            runner = Runner()
            print(f"[ORCHESTRATOR] Running agent...", file=sys.stderr)
            print(f"[ORCHESTRATOR] Agent has {len(self.agent.tools)} tools available", file=sys.stderr)
            print(f"[ORCHESTRATOR] Tool names: {[tool.name for tool in self.agent.tools]}", file=sys.stderr)

            result = runner.run_sync(
                starting_agent=self.agent,
                input=last_user_message,
                context={"user_id": memory_key, "conversation_history": messages}
            )
            print(f"[ORCHESTRATOR] Agent completed", file=sys.stderr)

            # Check if agent used any tools
            if hasattr(result, 'tool_calls') and result.tool_calls:
                print(f"[ORCHESTRATOR] Agent made {len(result.tool_calls)} tool calls", file=sys.stderr)
            else:
                print(f"[ORCHESTRATOR] WARNING: Agent made ZERO tool calls!", file=sys.stderr)

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
