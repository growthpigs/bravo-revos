"""
RevOS Read-Only Tools for HGC Agent
Provides access to campaign, pod, and LinkedIn performance data
"""

from openai_agents import function_tool
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

    @function_tool
    def get_campaign_metrics(self, campaign_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get campaign metrics and performance data.

        Args:
            campaign_id: Optional specific campaign ID. If not provided, returns all campaigns.

        Returns:
            Dictionary with campaign data including leads generated, posts created, and status.

        Example usage by agent:
            "Show me all my campaigns" -> get_campaign_metrics()
            "How is my AI Leadership campaign doing?" -> get_campaign_metrics(campaign_id="abc-123")
        """
        try:
            url = f"{self.api_base_url}/api/hgc/campaigns"
            if campaign_id:
                url += f"?campaign_id={campaign_id}"

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
                "error": f"Failed to fetch campaign metrics: {str(e)}"
            }

    @function_tool
    def analyze_pod_engagement(self, pod_id: str) -> Dict[str, Any]:
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
    def get_linkedin_performance(self, date_range: Optional[str] = "7d") -> Dict[str, Any]:
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

    def get_all_tools(self):
        """
        Get list of all tool functions for AgentKit agent registration.

        Returns:
            List of function_tool decorated methods
        """
        return [
            self.get_campaign_metrics,
            self.analyze_pod_engagement,
            self.get_linkedin_performance
        ]
