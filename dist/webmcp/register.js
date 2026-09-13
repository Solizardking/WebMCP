export async function registerWebMCPTools(tools, options = {}) {
    if (typeof document === "undefined")
        return () => { };
    // The supplied draft uses Document; Chrome's early implementation uses Navigator.
    const modelContext = document.modelContext ?? globalThis.navigator?.modelContext;
    if (typeof modelContext?.registerTool !== "function")
        return () => { };
    const controller = new AbortController();
    const registered = [];
    const signal = controller.signal;
    const abort = () => dispose();
    const dispose = () => {
        options.signal?.removeEventListener("abort", abort);
        controller.abort();
        for (const name of registered.splice(0))
            modelContext.unregisterTool?.(name);
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
            registered.push(tool.name);
            if (signal.aborted)
                dispose();
        }
    }
    catch (error) {
        dispose();
        throw error;
    }
    return dispose;
}
//# sourceMappingURL=register.js.map