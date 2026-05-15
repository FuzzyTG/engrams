# Engrams — Bootstrap Hook

Managed hook for OpenClaw `agent:bootstrap`.

Reads the Engrams index, selects the top 3 relevant topics for the current agent, and injects them into the agent's context via `bootstrapFiles`.
