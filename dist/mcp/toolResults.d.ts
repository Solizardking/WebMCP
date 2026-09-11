export declare function toolResult<T extends Record<string, unknown>>(data: T, text?: string): {
    structuredContent: T;
    content: {
        type: "text";
        text: string;
    }[];
};
//# sourceMappingURL=toolResults.d.ts.map