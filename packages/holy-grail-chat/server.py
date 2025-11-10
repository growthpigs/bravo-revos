#!/usr/bin/env python3
"""
HGC FastAPI Server
Fast server using refactored orchestrator with real Supabase queries
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import sys

# Add core directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'tools'))

from orchestrator import HGCOrchestrator

app = FastAPI()

# CORS for localhost development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global orchestrator instance (cached for performance)
_orchestrator_instance: Optional[HGCOrchestrator] = None

def get_orchestrator() -> HGCOrchestrator:
    """Get or create cached orchestrator instance"""
    global _orchestrator_instance

    if _orchestrator_instance is None:
        mem0_key = os.getenv("MEM0_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        api_base_url = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3000/api")

        if not mem0_key or not openai_key:
            raise ValueError("MEM0_API_KEY and OPENAI_API_KEY must be set")

        # Initialize once and cache
        _orchestrator_instance = HGCOrchestrator(
            mem0_key=mem0_key,
            openai_key=openai_key,
            api_base_url=api_base_url,
            auth_token=""  # Not used with service role key
        )
        print("[FASTAPI] Orchestrator initialized and cached", file=sys.stderr)

    return _orchestrator_instance

class ChatRequest(BaseModel):
    message: str
    user_id: str
    client_id: Optional[str] = None
    pod_id: str = "default"

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "HGC FastAPI",
        "version": "1.0.0",
        "backend": "Real Supabase Queries"
    }

@app.post("/chat")
async def chat(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """
    Main chat endpoint using real orchestrator with Supabase queries

    Expects Authorization header with Bearer token for Supabase auth
    """
    try:
        # Get cached orchestrator (massive performance improvement)
        orchestrator = get_orchestrator()

        print(f"[FASTAPI] Processing message for user {request.user_id}")

        # Build messages array (orchestrator expects this format)
        messages = [{"role": "user", "content": request.message}]

        # Call real orchestrator with Supabase queries (async)
        response = await orchestrator.process(
            messages=messages,
            user_id=request.user_id,
            pod_id=request.pod_id
        )

        print(f"[FASTAPI] Response: {response[:100]}...")

        return {
            "response": response,
            "success": True
        }

    except Exception as e:
        import traceback
        print(f"[FASTAPI ERROR] {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn

    print("\n" + "="*60)
    print("🚀 HGC FastAPI Server")
    print("="*60)
    print("Service: Holy Grail Chat")
    print("Backend: Real Supabase Queries")
    print("Port: 8000")
    print(f"\n🌐 Open: http://localhost:8000")
    print(f"🏥 Health: http://localhost:8000/health")
    print("="*60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)
