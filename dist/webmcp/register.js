export async function registerWebMCPTools(tools, options = {}) {
    if (typeof document === "undefined")
        return () => { };
    const modelContext = document.modelContext;
    if (typeof modelContext?.registerTool !== "function")
        return () => { };
    const controller = new AbortController();
    const signal = controller.signal;
    const abort = () => controller.abort(options.signal?.reason);
    const dispose = () => {
        options.signal?.removeEventListener("abort", abort);
        controller.abort();
    };
    if (options.signal?.aborted)
        return dispose;
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
        for (const tool of tools) {
            if (signal.aborted)
                break;
            await modelContext.registerTool(tool, {
                signal,
                exposedTo: options.exposedTo,
            });
        }
    }
    catch (error) {
        dispose();
        throw error;
    }
    return dispose;
}
//# sourceMappingURL=register.js.map