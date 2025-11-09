/**
 * End-to-End Tests for HGC Phase 2
 * Tests complete conversation flow with real components
 */

import { spawn, ChildProcess } from 'child_process'
import path from 'path'

// Note: These tests require actual Python environment
// Run with: MEM0_API_KEY=xxx OPENAI_API_KEY=xxx npm test -- hgc-e2e

describe('HGC Phase 2 - End-to-End Flow', () => {
  const TEST_TIMEOUT = 30000 // 30 seconds for LLM responses

  // Skip if environment variables not set
  const shouldRun = process.env.MEM0_API_KEY && process.env.OPENAI_API_KEY
  const testOrSkip = shouldRun ? test : test.skip

  describe('Python Orchestrator E2E', () => {
    testOrSkip('should handle single user message', async () => {
      const context = {
        user_id: 'test-user-e2e-1',
        pod_id: 'test-pod-e2e-1',
        messages: [{ role: 'user', content: 'Hello, what can you help me with?' }],
        api_base_url: 'http://localhost:3000',
        mem0_key: process.env.MEM0_API_KEY,
        openai_key: process.env.OPENAI_API_KEY,
        auth_token: 'test-token'
      }

      const result = await runPythonOrchestrator(context)

      expect(result.success).toBe(true)
      expect(result.content).toBeTruthy()
      expect(result.content.length).toBeGreaterThan(10)
      expect(result.memory_stored).toBe(true)
    }, TEST_TIMEOUT)

    testOrSkip('should maintain conversation context', async () => {
      const userId = `test-user-${Date.now()}`
      const podId = 'test-pod-context'

      // First message: Tell agent user's name
      const context1 = {
        user_id: userId,
        pod_id: podId,
        messages: [
          { role: 'user', content: 'My name is Alice and I prefer posting on LinkedIn at 2pm EST.' }
        ],
        api_base_url: 'http://localhost:3000',
        mem0_key: process.env.MEM0_API_KEY,
        openai_key: process.env.OPENAI_API_KEY,
        auth_token: 'test-token'
      }

      const result1 = await runPythonOrchestrator(context1)
      expect(result1.success).toBe(true)

      // Second message: Ask agent to recall
      const context2 = {
        user_id: userId,
        pod_id: podId,
        messages: [
          { role: 'user', content: 'My name is Alice and I prefer posting on LinkedIn at 2pm EST.' },
          { role: 'assistant', content: result1.content },
          { role: 'user', content: 'What time do I prefer posting?' }
        ],
        api_base_url: 'http://localhost:3000',
        mem0_key: process.env.MEM0_API_KEY,
        openai_key: process.env.OPENAI_API_KEY,
        auth_token: 'test-token'
      }

      const result2 = await runPythonOrchestrator(context2)
      expect(result2.success).toBe(true)
      expect(result2.content.toLowerCase()).toContain('2pm')
    }, TEST_TIMEOUT)

    testOrSkip('should isolate memories between users', async () => {
      const podId = 'test-pod-isolation'
      const user1 = `test-user-1-${Date.now()}`
      const user2 = `test-user-2-${Date.now()}`

      // User 1 saves preference
      const context1 = {
        user_id: user1,
        pod_id: podId,
        messages: [
          { role: 'user', content: 'I prefer posting at 9am.' }
        ],
        api_base_url: 'http://localhost:3000',
        mem0_key: process.env.MEM0_API_KEY,
        openai_key: process.env.OPENAI_API_KEY,
        auth_token: 'test-token'
      }

      await runPythonOrchestrator(context1)

      // User 2 saves different preference
      const context2 = {
        user_id: user2,
        pod_id: podId,
        messages: [
          { role: 'user', content: 'I prefer posting at 5pm.' }
        ],
        api_base_url: 'http://localhost:3000',
        mem0_key: process.env.MEM0_API_KEY,
        openai_key: process.env.OPENAI_API_KEY,
        auth_token: 'test-token'
      }

      await runPythonOrchestrator(context2)

      // User 1 asks about their preference
      const context1Query = {
        user_id: user1,
        pod_id: podId,
        messages: [
          { role: 'user', content: 'I prefer posting at 9am.' },
          { role: 'assistant', content: 'Got it!' },
          { role: 'user', content: 'What time do I prefer posting?' }
        ],
        api_base_url: 'http://localhost:3000',
        mem0_key: process.env.MEM0_API_KEY,
        openai_key: process.env.OPENAI_API_KEY,
        auth_token: 'test-token'
      }

      const result1Query = await runPythonOrchestrator(context1Query)
      expect(result1Query.content.toLowerCase()).toContain('9')
      expect(result1Query.content.toLowerCase()).not.toContain('5pm')
    }, TEST_TIMEOUT * 2)
  })

  describe('Memory Persistence', () => {
    testOrSkip('should persist memory across sessions', async () => {
      const userId = `test-user-persist-${Date.now()}`
      const podId = 'test-pod-persist'

      // Session 1: Save preference
      const context1 = {
        user_id: userId,
        pod_id: podId,
        messages: [
          { role: 'user', content: 'Remember that my LinkedIn handle is @aliceintech' }
        ],
        api_base_url: 'http://localhost:3000',
        mem0_key: process.env.MEM0_API_KEY,
        openai_key: process.env.OPENAI_API_KEY,
        auth_token: 'test-token'
      }

      const result1 = await runPythonOrchestrator(context1)
      expect(result1.success).toBe(true)

      // Wait a bit to ensure memory is persisted
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Session 2: New conversation (no history) - should recall from Mem0
      const context2 = {
        user_id: userId,
        pod_id: podId,
        messages: [
          { role: 'user', content: 'What is my LinkedIn handle?' }
        ],
        api_base_url: 'http://localhost:3000',
        mem0_key: process.env.MEM0_API_KEY,
        openai_key: process.env.OPENAI_API_KEY,
        auth_token: 'test-token'
      }

      const result2 = await runPythonOrchestrator(context2)
      expect(result2.success).toBe(true)
      expect(result2.content.toLowerCase()).toContain('aliceintech')
    }, TEST_TIMEOUT * 2)
  })

  describe('Error Handling', () => {
    test('should handle missing environment variables', async () => {
      const context = {
        user_id: 'test-user',
        pod_id: 'test-pod',
        messages: [{ role: 'user', content: 'Hello' }],
        api_base_url: 'http://localhost:3000',
        mem0_key: '', // Missing
        openai_key: '', // Missing
        auth_token: 'test-token'
      }

      const result = await runPythonOrchestrator(context)

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    test('should handle invalid JSON context', async () => {
      const pythonPath = path.join(
        process.cwd(),
        'packages/holy-grail-chat/core/runner.py'
      )

      const python = spawn(pythonPath, [], {
        env: {
          ...process.env,
          HGC_CONTEXT: 'invalid-json'
        }
      })

      const result = await new Promise<any>((resolve) => {
        let stderr = ''

        python.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        python.on('close', (code) => {
          resolve({
            exitCode: code,
            stderr
          })
        })
      })

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('error')
    })
  })
})

/**
 * Helper function to run Python orchestrator
 */
async function runPythonOrchestrator(context: any): Promise<any> {
  const pythonPath = path.join(
    process.cwd(),
    'packages/holy-grail-chat/core/runner.py'
  )

  return new Promise((resolve) => {
    const python = spawn(pythonPath, [], {
      env: {
        ...process.env,
        HGC_CONTEXT: JSON.stringify(context)
      }
    })

    let stdout = ''
    let stderr = ''

    python.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    python.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    python.on('close', (code) => {
      if (code !== 0) {
        resolve({
          success: false,
          error: stderr,
          exitCode: code
        })
      } else {
        try {
          const result = JSON.parse(stdout)
          resolve({
            success: true,
            ...result
          })
        } catch (e) {
          resolve({
            success: false,
            error: 'Failed to parse JSON response',
            stdout,
            stderr
          })
        }
      }
    })

    python.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      })
    })
  })
}
