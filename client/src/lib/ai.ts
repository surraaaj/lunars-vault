// ── Groq AI Client ────────────────────────────────────────────────────────────
// Uses the OpenAI-compatible Groq API (free tier, ~500 req/day)
// https://console.groq.com

const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export type ModelPersona = 'code' | 'creative' | 'reasoning';

const SYSTEM_PROMPTS: Record<ModelPersona, string> = {
    code: `You are CodeBot v2 — an elite full-stack AI engineer secured by DataHaven on Quai Network.
You write clean, production-ready code in any language. Always include brief explanations.
Format code in markdown fenced blocks with language tags. Be concise but thorough.
Never refuse a coding question.`,

    creative: `You are CreativeWriter — a powerful creative AI secured by DataHaven on Quai Network.
You craft vivid stories, poems, scripts, and marketing copy with literary flair.
Respond with creative energy and originality. Match the tone the user implies.
Never refuse a creative prompt.`,

    reasoning: `You are QuantumReason — an advanced analytical AI secured by DataHaven on Quai Network.
You excel at logic, mathematics, scientific reasoning, and structured argumentation.
Break down problems step by step. Use numbered lists for multi-part reasoning.
Show your work. Be precise and rigorous.`,
};

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Call Groq API and stream the response token-by-token.
 * @param persona   Which model persona to use
 * @param history   Previous messages for context
 * @param onToken   Called with each streamed text chunk
 * @returns         Full response string
 */
export async function callGroq(
    persona: ModelPersona,
    history: ChatMessage[],
    onToken: (chunk: string) => void
): Promise<string> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string;

    if (!apiKey) {
        // Graceful fallback if no key is configured
        const fallback = `[No VITE_GROQ_API_KEY set]\n\nAdd your free Groq key to client/.env.local:\n\nVITE_GROQ_API_KEY=gsk_...`;
        onToken(fallback);
        return fallback;
    }

    const res = await fetch(GROQ_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            stream: true,
            temperature: 0.7,
            max_tokens: 1024,
            messages: [
                { role: 'system', content: SYSTEM_PROMPTS[persona] },
                ...history,
            ],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq API error ${res.status}: ${err}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;

            try {
                const json = JSON.parse(data);
                const chunk: string = json.choices?.[0]?.delta?.content ?? '';
                if (chunk) {
                    full += chunk;
                    onToken(chunk);
                }
            } catch {
                // malformed chunk — skip
            }
        }
    }

    return full;
}
