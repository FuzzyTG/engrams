---
name: engrams
description: "Inject relevant knowledge topics at agent bootstrap"
metadata: {"openclaw":{"events":["agent:bootstrap"]}}
---

# Engrams — Bootstrap Hook

Reads the Engrams index, selects the top 3 relevant topics for the current agent, and injects them into the agent's context via `bootstrapFiles`.
