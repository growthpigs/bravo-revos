"""
Input validation for HGC orchestrator

Provides validation and sanitization for user inputs to prevent
injection attacks, DoS, and other security issues.
"""

import re
from typing import List, Dict, Any, Tuple


class InputValidator:
    """Validates and sanitizes user inputs"""

    # Configuration constants
    MAX_MESSAGE_LENGTH = 10000  # 10k characters per message
    MAX_MESSAGES = 100          # Max messages in conversation history
    ALLOWED_ROLES = {'user', 'assistant', 'system'}

    @staticmethod
    def validate_messages(messages: List[Dict[str, Any]]) -> Tuple[bool, str]:
        """
        Validate conversation messages structure and content.

        Args:
            messages: List of message dictionaries with 'role' and 'content' keys

        Returns:
            Tuple of (is_valid, error_message)
            - is_valid: True if validation passes
            - error_message: Empty string if valid, otherwise describes the error

        Example:
            >>> messages = [{"role": "user", "content": "Hello"}]
            >>> valid, error = InputValidator.validate_messages(messages)
            >>> assert valid == True
        """
        if not isinstance(messages, list):
            return False, "Messages must be a list"

        if len(messages) == 0:
            return False, "Messages list cannot be empty"

        if len(messages) > InputValidator.MAX_MESSAGES:
            return False, f"Too many messages (max {InputValidator.MAX_MESSAGES}, got {len(messages)})"

        for i, msg in enumerate(messages):
            if not isinstance(msg, dict):
                return False, f"Message at index {i} must be a dictionary"

            # Check required fields
            if 'role' not in msg:
                return False, f"Message at index {i} missing 'role' field"

            if 'content' not in msg:
                return False, f"Message at index {i} missing 'content' field"

            # Validate role
            role = msg.get('role')
            if role not in InputValidator.ALLOWED_ROLES:
                return False, f"Invalid role '{role}' at index {i}. Allowed: {InputValidator.ALLOWED_ROLES}"

            # Validate content
            content = msg.get('content', '')
            if not isinstance(content, str):
                return False, f"Message content at index {i} must be a string"

            if len(content) > InputValidator.MAX_MESSAGE_LENGTH:
                return False, f"Message at index {i} too long (max {InputValidator.MAX_MESSAGE_LENGTH}, got {len(content)})"

        return True, ""

    @staticmethod
    def sanitize_message(content: str) -> str:
        """
        Sanitize message content by removing potentially dangerous characters.

        Removes:
        - Null bytes
        - Control characters (except newlines, tabs, carriage returns)
        - Non-printable characters

        Args:
            content: Raw message content

        Returns:
            Sanitized content safe for processing

        Example:
            >>> sanitized = InputValidator.sanitize_message("Hello\\x00World")
            >>> assert "\\x00" not in sanitized
        """
        if not content:
            return ""

        # Remove null bytes and most control characters
        # Keep newline (\n), tab (\t), carriage return (\r)
        sanitized = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', '', content)

        # Trim excessive whitespace
        sanitized = sanitized.strip()

        return sanitized

    @staticmethod
    def validate_user_id(user_id: str) -> Tuple[bool, str]:
        """
        Validate user_id format.

        Args:
            user_id: User identifier (UUID format expected)

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not user_id:
            return False, "user_id cannot be empty"

        if not isinstance(user_id, str):
            return False, "user_id must be a string"

        if len(user_id) > 255:
            return False, "user_id too long (max 255 characters)"

        # Allow alphanumeric, hyphens, underscores, colons (for pod::user format)
        if not re.match(r'^[a-zA-Z0-9_:.-]+$', user_id):
            return False, "user_id contains invalid characters"

        return True, ""

    @staticmethod
    def validate_pod_id(pod_id: str) -> Tuple[bool, str]:
        """
        Validate pod_id format.

        Args:
            pod_id: Pod identifier

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not pod_id:
            return False, "pod_id cannot be empty"

        if not isinstance(pod_id, str):
            return False, "pod_id must be a string"

        if len(pod_id) > 255:
            return False, "pod_id too long (max 255 characters)"

        # Allow alphanumeric, hyphens, underscores
        if not re.match(r'^[a-zA-Z0-9_.-]+$', pod_id):
            return False, "pod_id contains invalid characters"

        return True, ""
