export function toolResult<T extends Record<string, unknown>>(data: T, text?: string) {
  return {
    structuredContent: data,
    content: [
      {
        type: "text" as const,
        text: text ?? JSON.stringify(data),
      },
    ],
  };
}
