"""
RevOS Tools for HGC Agent
Provides access to campaign, pod, and LinkedIn performance data
Factory functions create standalone tool functions (no self parameter)
"""

from agents import function_tool
import requests
from typing import Optional, Dict, Any


class RevOSTools:
    """Tools for accessing RevOS data from HGC agent"""

    def __init__(self, api_base_url: str, auth_token: str):
        """
        Initialize RevOS tools with API configuration

        Args:
            api_base_url: Base URL for RevOS API (e.g., https://app.revos.com or http://localhost:3000)
            auth_token: Supabase auth token from user session
        """
        self.api_base_url = api_base_url.rstrip('/')
        self.headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }

    def get_all_tools(self):
        """
        Get list of all tool functions for AgentKit agent registration.
        Creates standalone functions that capture self via closure.

        Returns:
            List of function_tool decorated standalone functions
        """
        @function_tool
        def get_all_campaigns() -> Dict[str, Any]:
            """
            Get ALL campaigns for current user with basic metrics.

            Returns all user's campaigns. NO parameters needed.

            Use when user asks:
            - "show me my campaigns"
            - "list all campaigns"
            - "what campaigns do I have?"
            - "give me my campaigns"

            Returns:
                Dictionary with list of all campaigns including names, status, and basic metrics.
            """
            try:
                url = f"{self.api_base_url}/api/hgc/campaigns"
                response = requests.get(url, headers=self.headers, timeout=10)
                response.raise_for_status()

                data = response.json()
                return {
                    "success": True,
                    "campaigns": data.get("campaigns", []),
                    "count": data.get("count", 0)
                }
            except requests.RequestException as e:
                return {
                    "success": False,
                    "error": f"Failed to fetch campaigns: {str(e)}"
                }

        @function_tool
        def get_campaign_by_id(campaign_id: str) -> Dict[str, Any]:
            """
            Get detailed metrics for ONE specific campaign.

            Args:
                campaign_id: The campaign UUID (REQUIRED)

            Use when user mentions a specific campaign name or asks for campaign details.

            Example usage:
                "How is my AI Leadership campaign doing?" -> get_campaign_by_id(campaign_id="abc-123")
                "Show metrics for campaign XYZ" -> get_campaign_by_id(campaign_id="xyz-456")

            Returns:
                Dictionary with detailed campaign metrics including leads, posts, and performance.
            """
            try:
                url = f"{self.api_base_url}/api/hgc/campaigns?campaign_id={campaign_id}"
                response = requests.get(url, headers=self.headers, timeout=10)
                response.raise_for_status()

                data = response.json()
                return {
                    "success": True,
                    "campaigns": data.get("campaigns", []),
                    "count": data.get("count", 0)
                }
            except requests.RequestException as e:
                return {
                    "success": False,
                    "error": f"Failed to fetch campaign: {str(e)}"
                }

        @function_tool
        def analyze_pod_engagement(pod_id: str) -> Dict[str, Any]:
            """
            Analyze engagement pod performance and member participation.

            Args:
                pod_id: UUID of the engagement pod to analyze (required)

            Returns:
                Dictionary with pod engagement metrics including member counts, participation scores,
                and health status.

            Example usage by agent:
                "How is my pod performing?" -> analyze_pod_engagement(pod_id="pod-123")
                "Check pod health" -> analyze_pod_engagement(pod_id="pod-456")
            """
            try:
                url = f"{self.api_base_url}/api/hgc/pods?pod_id={pod_id}"

                response = requests.get(url, headers=self.headers, timeout=10)
                response.raise_for_status()

                data = response.json()
                return {
                    "success": True,
                    "engagement": data.get("engagement", {})
                }
            except requests.RequestException as e:
                return {
                    "success": False,
                    "error": f"Failed to analyze pod engagement: {str(e)}"
                }

        @function_tool
        def get_linkedin_performance(date_range: Optional[str] = "7d") -> Dict[str, Any]:
            """
            Get LinkedIn performance metrics over a date range.

            Args:
                date_range: Time period to analyze. Options: '1d', '7d', '30d', '90d'. Defaults to '7d'.

            Returns:
                Dictionary with LinkedIn performance metrics including posts published, leads generated,
                DMs sent, conversion rates, and top performing campaigns.

            Example usage by agent:
                "How are my LinkedIn posts performing?" -> get_linkedin_performance()
                "Show me last month's performance" -> get_linkedin_performance(date_range="30d")
            """
            try:
                url = f"{self.api_base_url}/api/hgc/linkedin?date_range={date_range}"

                response = requests.get(url, headers=self.headers, timeout=10)
                response.raise_for_status()

                data = response.json()
                return {
                    "success": True,
                    "performance": data.get("performance", {})
                }
            except requests.RequestException as e:
                return {
                    "success": False,
                    "error": f"Failed to fetch LinkedIn performance: {str(e)}"
                }

        @function_tool
        def create_campaign(name: str, voice_id: str, description: Optional[str] = None) -> Dict[str, Any]:
            """
            Create a new LinkedIn campaign (draft status, requires review).

            Args:
                name: Campaign name (e.g., "AI Leadership Series")
                voice_id: Voice cartridge ID to use for content generation
                description: Optional campaign description/goals

            Returns:
                Dictionary with draft campaign details and ID

            Safety: Creates campaign in DRAFT status only. User must review and activate.

            Example usage by agent:
                "Create a campaign about AI" -> create_campaign(name="AI Insights", voice_id="voice-123")
            """
            try:
                url = f"{self.api_base_url}/api/hgc/campaigns/create"
                payload = {
                    "name": name,
                    "voice_id": voice_id,
                    "description": description,
                    "status": "draft"  # Always draft for safety
                }

                response = requests.post(url, json=payload, headers=self.headers, timeout=10)
                response.raise_for_status()

                data = response.json()
                return {
                    "success": True,
                    "campaign": data.get("campaign", {}),
                    "message": "Campaign created in DRAFT status. Review and activate in dashboard."
                }
            except requests.RequestException as e:
                return {
                    "success": False,
                    "error": f"Failed to create campaign: {str(e)}"
                }

        @function_tool
        def schedule_post(content: str, schedule_time: str, campaign_id: Optional[str] = None) -> Dict[str, Any]:
            """
            Queue a LinkedIn post for review and scheduling.

            Args:
                content: Post content text
                schedule_time: ISO format datetime (e.g., "2025-11-10T14:00:00Z")
                campaign_id: Optional campaign ID to associate with

            Returns:
                Dictionary with queued post details

            Safety: Posts go to REVIEW QUEUE only. No direct publishing.

            Example usage by agent:
                "Schedule a post about AI for tomorrow at 2pm" -> schedule_post(content="...", schedule_time="2025-11-10T14:00:00Z")
            """
            try:
                url = f"{self.api_base_url}/api/hgc/posts/queue"
                payload = {
                    "content": content,
                    "schedule_time": schedule_time,
                    "campaign_id": campaign_id,
                    "status": "queued"  # Always queued for safety
                }

                response = requests.post(url, json=payload, headers=self.headers, timeout=10)
                response.raise_for_status()

                data = response.json()
                return {
                    "success": True,
                    "post": data.get("post", {}),
                    "message": "Post queued for review. Approve in dashboard to publish."
                }
            except requests.RequestException as e:
                return {
                    "success": False,
                    "error": f"Failed to queue post: {str(e)}"
                }

        @function_tool
        def analyze_campaign_performance(campaign_id: str) -> Dict[str, Any]:
            """
            Deep analytics on campaign performance with AI-powered recommendations.

            Args:
                campaign_id: Campaign UUID to analyze

            Returns:
                Dictionary with detailed metrics, trends, and optimization recommendations

            Example usage by agent:
                "Analyze my AI campaign performance" -> analyze_campaign_performance(campaign_id="camp-123")
            """
            try:
                url = f"{self.api_base_url}/api/hgc/campaigns/analyze?campaign_id={campaign_id}"

                response = requests.get(url, headers=self.headers, timeout=10)
                response.raise_for_status()

                data = response.json()
                return {
                    "success": True,
                    "analysis": data.get("analysis", {}),
                    "recommendations": data.get("recommendations", [])
                }
            except requests.RequestException as e:
                return {
                    "success": False,
                    "error": f"Failed to analyze campaign: {str(e)}"
                }

        return [
            # Read tools
            get_all_campaigns,           # NEW: Get all campaigns (no parameters)
            get_campaign_by_id,          # NEW: Get specific campaign (required parameter)
            analyze_pod_engagement,
            get_linkedin_performance,
            # Write tools (with safety controls)
            create_campaign,
            schedule_post,
            analyze_campaign_performance
        ]
