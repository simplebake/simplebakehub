import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPremixesTool from "./tools/list-premixes";
import listFeedingLogsTool from "./tools/list-feeding-logs";
import logFeedingTool from "./tools/log-feeding";
import listBakingSessionsTool from "./tools/list-baking-sessions";
import listTutorialsTool from "./tools/list-tutorials";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "simple-bake-hub",
  title: "Simple Bake Hub",
  version: "0.1.0",
  instructions:
    "Tools for Simple Bake Hub, a gluten-free sourdough baking companion. Use `list_premixes` and `list_tutorials` for baking guidance, `list_feeding_logs` and `log_feeding` for the baker's sourdough starter, and `list_baking_sessions` for their bake history. All data belongs to the signed-in baker. Use British English and Celsius first.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listPremixesTool,
    listTutorialsTool,
    listFeedingLogsTool,
    logFeedingTool,
    listBakingSessionsTool,
  ],
});
