
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const streamOpenRouter = async (
    apiKey: string,
    model: string,
    messages: any[],
    callbacks: {
        onTextChunk: (text: string) => void;
        onComplete: (fullText: string) => void;
        onError: (error: any) => void;
    },
    settings: {
        temperature: number;
        maxTokens: number;
        topP?: number;
    }
) => {
    try {
        const cleanKey = apiKey ? apiKey.trim() : "";
        if (!cleanKey) {
            throw new Error("OpenRouter API key is missing or empty. Please check your settings.");
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${cleanKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://agentic-ai-chat.local", // Provides context to OpenRouter
                "X-Title": "Agentic AI Chat",
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true,
                temperature: settings.temperature,
                max_tokens: settings.maxTokens > 0 ? settings.maxTokens : undefined,
                top_p: settings.topP,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let parsedError;
            try {
                parsedError = JSON.parse(errorText);
            } catch (e) {
                parsedError = { error: { message: errorText } };
            }
            
            const message = parsedError.error?.message || errorText;
            const code = parsedError.error?.code || response.status;
            
            throw new Error(`OpenRouter Error (${code}): ${message}`);
        }

        if (!response.body) throw new Error("No response body from OpenRouter");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter(line => line.trim() !== "");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const dataStr = line.replace("data: ", "");
                    if (dataStr === "[DONE]") break;

                    try {
                        const data = JSON.parse(dataStr);
                        const delta = data.choices[0]?.delta?.content;
                        if (delta) {
                            fullText += delta;
                            callbacks.onTextChunk(delta);
                        }
                    } catch (e) {
                        console.error("Error parsing OpenRouter chunk", e);
                    }
                }
            }
        }

        callbacks.onComplete(fullText);

    } catch (error) {
        console.error("OpenRouter stream failed:", error);
        callbacks.onError(error);
    }
};
