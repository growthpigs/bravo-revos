# Gemini Configuration

To use the Gemini features in this project, you need to configure the `GOOGLE_GENERATIVE_AI_API_KEY` environment variable.

## Setup Instructions

1.  **Get an API Key:**
    *   Go to [Google AI Studio](https://aistudio.google.com/).
    *   Create a new API key.

2.  **Configure Environment:**
    *   Open or create `.env.local` in the project root.
    *   Add the following line:
        ```bash
        GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
        ```

3.  **Security:**
    *   **NEVER** commit your actual API key to version control.
    *   Ensure `.env.local` is in your `.gitignore` file (it should be by default).
