/**
 * Cognitive Graph Prompt ΓÇö Single Pipeline Call
 * 
 * One prompt that takes compact session data + current graph snapshot
 * and outputs precise graph mutations. This replaces dumping full JSON
 * into separate prompts ΓÇö all graph reasoning happens in one efficient call.
 * 
 * Target budget: ~1500-2500 input tokens, ~500-1000 output tokens.
 */

import type { CompactGraphSnapshot } from './types'
import type { AssessmentSnapshot } from '@/lib/llm/types'
import { compactPersona, compactInsights, compactProfile, compactGraphToString } from './compactify'
import type { UserPersona, InvestigativeInsight, CognitiveBehavioralProfile, InvestigativeReport } from '@/lib/llm/types'

interface GraphPromptParams {
    state: AssessmentSnapshot
    insights: InvestigativeInsight[]
    profile: CognitiveBehavioralProfile
    report: InvestigativeReport
    existingPersona: Partial<UserPersona> | null
    currentGraph: CompactGraphSnapshot | null
    sessionId: string
}

export const COGNITIVE_GRAPH_PROMPT = {
    version: '1.0',
    template: (params: GraphPromptParams) => `
You are a COGNITIVE GRAPH ARCHITECT. You maintain a dynamic graph of cognitive opinions about a learner. Each node is an opinion/observation/trait with confidence and state. Your job: given new session evidence, output precise graph mutations.

STATE MACHINE RULES:
- tentative ΓåÆ solidified (confidence crosses 0.8 with supporting evidence)
- tentative ΓåÆ revised (contradicting evidence)
- solidified ΓåÆ reconsidering (new contradicting session data)
- reconsidering ΓåÆ doubled_down (re-confirmed)
- reconsidering ΓåÆ fallen_back (was wrong, revert to previous)
- reconsidering ΓåÆ revised (change to new position)

SESSION EVIDENCE:
Topic: ${params.state.topic} | Questions: ${params.state.questionsAnswered} | Difficulty: ${params.state.currentDifficulty}
Accuracy: ${params.state.history.length > 0 ? Math.round(params.state.history.filter(h => h.isCorrect).length / params.state.history.length * 100) : 0}%

COGNITIVE PROFILE:
${compactProfile(params.profile)}

KEY INSIGHTS:
${compactInsights(params.insights, 5)}

KNOWLEDGE TOPOLOGY:
Strongholds: ${params.report.knowledgeTopology?.strongholds?.slice(0, 5).join(', ') || 'none'}
Gaps: ${params.report.knowledgeTopology?.gaps?.slice(0, 5).join(', ') || 'none'}
Frontiers: ${params.report.knowledgeTopology?.frontiers?.slice(0, 3).join(', ') || 'none'}

PRIOR PERSONA:
${compactPersona(params.existingPersona)}

CURRENT GRAPH:
${compactGraphToString(params.currentGraph)}

INSTRUCTIONS:
1. For EXISTING nodes: check if new evidence supports, contradicts, or has no effect. Apply state transitions.
2. For NEW observations: create new nodes as 'tentative' with initial confidence.
3. Create edges between nodes that support/contradict each other.
4. Be conservative ΓÇö only mutate when evidence is clear. Do NOT create nodes for weak signals.
5. Prefer updating existing nodes over creating duplicates.
6. Use domains: error_patterns, learning_style, knowledge_topology, metacognition, behavioral, persistence

Generate JSON (no markdown):
{
  "mutations": [
    {
      "type": "add_node|update_node|solidify|reconsider|double_down|fall_back|revise|add_edge|update_edge|remove_edge",
      "nodeId": "existing_node_id or new_unique_id",
      "node": {
        "type": "opinion|observation|hypothesis|trait|strength|gap",
        "label": "Short label",
        "detail": "Detailed description",
        "confidence": 0.75,
        "domain": "error_patterns|learning_style|knowledge_topology|metacognition|behavioral|persistence"
      },
      "edgeId": "edge_id (for edge mutations)",
      "edge": {
        "source": "node_id",
        "target": "node_id",
        "relation": "supports|contradicts|depends_on|evolves_into|related_to",
        "weight": 0.8,
        "evidence": "why this edge"
      },
      "reason": "Why this mutation",
      "newEvidence": ["evidence strings"],
      "confidenceDelta": 0.1
    }
  ],
  "summary": "One sentence: what changed in the graph this session"
}
`,
}