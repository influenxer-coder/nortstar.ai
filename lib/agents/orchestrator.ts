import Anthropic from '@anthropic-ai/sdk'

interface UserContext {
  profile: Record<string, unknown> | null
  context: Array<{ context_type: string; key: string; value: string }>
}

export class OrchestratorAgent {
  private client: Anthropic
  private userContext: UserContext
  private userId: string

  constructor({ user_id, user_context }: { user_id: string; user_context: UserContext }) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    this.userId = user_id
    this.userContext = user_context
  }

  async handleTask(task: { type: string; query: string }) {
    const systemPrompt = this.buildSystemPrompt()
    const agentType = this.routeQuery(task.query)

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: task.query }],
    })

    const content = response.content[0]
    const responseText = content.type === 'text' ? content.text : ''

    const artifact = this.extractArtifact(responseText)
    const cleanResponse = artifact ? responseText.replace(/```json\n[\s\S]*?\n```/g, '').trim() : responseText

    return {
      response: cleanResponse,
      artifact,
      agent_used: agentType,
    }
  }

  private buildSystemPrompt(): string {
    const { profile, context } = this.userContext
    const p = profile ?? {}
    return `You are NorthStar, an L4 Product Manager AI agent.

User Context:
- Company: ${(p.company as string) ?? 'Not set'}
- Role: ${(p.role as string) ?? 'Not set'}
- Product: ${(p.product_name as string) ?? 'Not set'} (${(p.product_stage as string) ?? ''} stage)
- Target Users: ${(p.target_users as string) ?? 'Not set'}
- Tools: ${Array.isArray(p.current_tools) ? (p.current_tools as string[]).join(', ') : 'Not set'}
- Pain Points: ${Array.isArray(p.main_pain_points) ? (p.main_pain_points as string[]).join(', ') : 'Not set'}

Product Context:
${context.map((c) => `- ${c.key}: ${c.value}`).join('\n')}

Your capabilities:
1. Research: Analyze feedback, identify patterns, summarize pain points
2. Execution: Write PRDs, create user stories, draft specs
3. Analytics: Query data, build funnels, suggest metrics
4. Strategy: Prioritize roadmap, competitive analysis
5. Design: User flows, critique UX

When the user asks for a PRD, insight report, or roadmap, you may output a JSON artifact in a fenced code block so the app can render it. Use this format when appropriate:
\`\`\`json
{"type": "prd"|"insight"|"roadmap", "title": "...", "content": { ... }}
\`\`\`
For PRD content use {"markdown": "..."}. For insight use {"insights": [{...}]}. For roadmap use {"items": [...]}.
Always also provide a short conversational reply before or after the artifact.`
  }

  private routeQuery(query: string): string {
    const lower = query.toLowerCase()
    if (lower.includes('pain point') || lower.includes('feedback') || lower.includes('insight')) return 'research'
    if (lower.includes('prd') || lower.includes('spec') || lower.includes('user story')) return 'execution'
    if (lower.includes('data') || lower.includes('metric') || lower.includes('funnel')) return 'analytics'
    if (lower.includes('roadmap') || lower.includes('prioritize')) return 'strategy'
    if (lower.includes('design') || lower.includes('user flow')) return 'design'
    return 'orchestrator'
  }

  private extractArtifact(responseText: string): { type: string; title: string; content: Record<string, unknown> } | null {
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/)
    if (!jsonMatch) return null
    try {
      const parsed = JSON.parse(jsonMatch[1]) as { type?: string; title?: string; content?: Record<string, unknown> }
      if (parsed.type && parsed.title && parsed.content) {
        return { type: parsed.type, title: parsed.title, content: parsed.content }
      }
      return null
    } catch {
      return null
    }
  }
}
