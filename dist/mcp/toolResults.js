export function toolResult(data, text) {
    return {
        structuredContent: data,
        content: [
            {
                type: "text",
                text: text ?? JSON.stringify(data),
            },
        ],
    };
}
//# sourceMappingURL=toolResults.js.map