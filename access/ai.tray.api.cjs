import { loadAIIdentity } from "./identity/ai.identity.cjs";

// Bootstrap identity at backend startup
await loadAIIdentity();
