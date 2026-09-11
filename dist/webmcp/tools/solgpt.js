export function createSolGPTWebMCPTools(adapters) {
    return [
        {
            name: "solgpt.ask",
            title: "Ask SOLGPT",
            description: "Ask the SOLGPT intelligence layer a Solana-focused question using optional context from the current page.",
            inputSchema: {
                type: "object",
                properties: {
                    prompt: { type: "string", minLength: 1, maxLength: 12000 },
                    context: { type: "string", maxLength: 12000 },
                },
                required: ["prompt"],
                additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
            execute: async ({ prompt, context }) => adapters.ask({
                prompt: String(prompt),
                context: context === undefined ? undefined : String(context),
            }),
        },
    ];
}
//# sourceMappingURL=solgpt.js.map