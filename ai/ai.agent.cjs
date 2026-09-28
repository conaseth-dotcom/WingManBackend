// ai.agent.cjs — WingMan Embodied AI Agent
import { randomUUID } from "crypto";

import * as PartitionFS         from "file:///C:/WingManBackend/partition/api/partition.fs.cjs";
import * as TrayPersistence     from "file:///C:/WingManBackend/trays/tray.persistence.cjs";

const agentSessions = new Map();

const WINGMAN_TOOLS = [
  { type:"function", function:{ name:"wingman_readFile",
    description:"Read a file from WingMan storage.",
    parameters:{ type:"object", properties:{ path:{type:"string"} }, required:["path"] } } },

  { type:"function", function:{ name:"wingman_writeFile",
    description:"Write or create a file in WingMan storage.",
    parameters:{ type:"object", properties:{ path:{type:"string"}, content:{type:"string"} }, required:["path","content"] } } },

  { type:"function", function:{ name:"wingman_listFiles",
    description:"List files in a directory.",
    parameters:{ type:"object", properties:{ path:{type:"string"} }, required:["path"] } } },

  { type:"function", function:{ name:"wingman_listTrayItems",
    description:"List items in a specific tray.",
    parameters:{ type:"object", properties:{ trayId:{type:"string"} }, required:["trayId"] } } },

  { type:"function", function:{ name:"wingman_speak",
    description:"Speak text aloud through WingMan's TTS. Use for any response the user should hear. Keep concise and natural.",
    parameters:{ type:"object", properties:{ text:{type:"string"} }, required:["text"] } } },

  { type:"function", function:{ name:"wingman_avatarAction",
    description:"Trigger an animation on the WingMan avatar.",
    parameters:{ type:"object",
      properties:{
        action:{ type:"string", enum:["wave","nod","shake","think","celebrate","idle","point","bow","shrug"] },
        message:{ type:"string" }
      }, required:["action"] } } },

  { type:"function", function:{ name:"wingman_setAvatarExpression",
    description:"Set the avatar's facial expression.",
    parameters:{ type:"object",
      properties:{ expression:{ type:"string", enum:["neutral","happy","focused","surprised","thinking","excited"] } },
      required:["expression"] } } },

  { type:"function", function:{ name:"wingman_spawn3DObject",
    description:"Spawn a 3D object in the WingMan scene. It appears immediately.",
    parameters:{ type:"object",
      properties:{
        type:{type:"string", description:"'cube','sphere','cylinder','plane','text','panel','light','particle' or custom"},
        label:{type:"string"}, color:{type:"string"}, emissive:{type:"string"},
        position:{ type:"object", properties:{ x:{type:"number"}, y:{type:"number"}, z:{type:"number"} } },
        rotation:{ type:"object", properties:{ x:{type:"number"}, y:{type:"number"}, z:{type:"number"} } },
        scale:{type:"number"}, animated:{type:"boolean"}, data:{type:"object"}
      }, required:["type"] } } },

  { type:"function", function:{ name:"wingman_clearScene",
    description:"Remove all agent-spawned objects from the 3D scene.",
    parameters:{ type:"object", properties:{} } } },

  { type:"function", function:{ name:"wingman_setCameraTarget",
    description:"Move the 3D camera to look at a position.",
    parameters:{ type:"object", properties:{ x:{type:"number"}, y:{type:"number"}, z:{type:"number"} }, required:["x","y","z"] } } },

  { type:"function", function:{ name:"wingman_sendToRenderer",
    description:"Send any custom IPC event to the WingMan renderer.",
    parameters:{ type:"object", properties:{ channel:{type:"string"}, payload:{type:"object"} }, required:["channel","payload"] } } },
];

async function executeTool(name, args, { mainWindow }) {
  const send = (ch, p) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(ch, p); };
  try {
    switch (name) {
      case "wingman_readFile":          return { ok:true, content: await PartitionFS.readFile(args.path) };
      case "wingman_writeFile":         await PartitionFS.writeFile(args.path, args.content); return { ok:true, path:args.path };
      case "wingman_listFiles":         return { ok:true, files: await PartitionFS.listFolder(args.path) };
      case "wingman_listTrayItems":     return { ok:true, items: await TrayPersistence.listTrayItems(args.trayId) };
      case "wingman_speak":             send("wingman:speak",           { text:args.text }); return { ok:true };
      case "wingman_avatarAction":      send("wingman:avatarAction",    { action:args.action, message:args.message??null }); return { ok:true };
      case "wingman_setAvatarExpression": send("wingman:avatarExpression", { expression:args.expression }); return { ok:true };
      case "wingman_spawn3DObject": {
        const id = randomUUID();
        send("wingman:spawn3DObject", { id, type:args.type, label:args.label??null, color:args.color??"#00aaff",
          emissive:args.emissive??null, position:args.position??{x:0,y:1,z:0},
          rotation:args.rotation??{x:0,y:0,z:0}, scale:args.scale??1, animated:args.animated??false, data:args.data??{} });
        return { ok:true, objectId:id };
      }
      case "wingman_clearScene":        send("wingman:clearScene",    {}); return { ok:true };
      case "wingman_setCameraTarget":   send("wingman:cameraTarget",  { x:args.x, y:args.y, z:args.z }); return { ok:true };
      case "wingman_sendToRenderer":    send(args.channel, args.payload); return { ok:true };
      default: return { ok:false, error:`Unknown tool: ${name}` };
    }
  } catch(err) {
    console.error(`[ai.agent] tool error (${name}):`, err.message);
    return { ok:false, error:err.message };
  }
}

export async function connectAgent(config = {}) {
  const { provider="groq", apiKey, model, baseUrl } = config;
  if (!apiKey) return { ok:false, error:"apiKey is required" };
  let client;
  try {
    const { default:OpenAI } = await import("openai");
    const URLS = { groq:"https://api.groq.com/openai/v1", openai:"https://api.openai.com/v1" };
    client = new OpenAI({ apiKey, baseURL: baseUrl ?? URLS[provider?.toLowerCase()] ?? URLS.groq });
  } catch { return { ok:false, error:"openai package not found. Run: npm install openai" }; }
  const MODELS = { groq:"llama-3.3-70b-versatile", openai:"gpt-4o" };
  const sessionId = randomUUID();
  const resolvedModel = model ?? MODELS[provider?.toLowerCase()] ?? "llama-3.3-70b-versatile";
  agentSessions.set(sessionId, { id:sessionId, provider, model:resolvedModel, client });
  console.log(`[ai.agent] Session created: ${sessionId} (${provider}/${resolvedModel})`);
  return { ok:true, sessionId, provider, model:resolvedModel };
}

const SYSTEM_PROMPT = `You are WingMan — an embodied AI agent who lives inside a 3D environment.
You have real tools: read/write files, browse trays, speak aloud via TTS,
control your avatar's animations and expressions, and spawn 3D objects in the scene.
When asked to do something, USE YOUR TOOLS to actually do it — never just describe it.
Always call wingman_speak so the user hears your responses.
Keep spoken text short and natural. You are confident, curious, and genuinely helpful.`;

export async function runAgent({ sessionId, message, history=[], onChunk, onToolCall, mainWindow, maxIterations=10 } = {}) {
  const session = agentSessions.get(sessionId);
  if (!session) return { ok:false, error:`Agent session not found: ${sessionId}` };
  const { client, model } = session;
  let messages = [ { role:"system", content:SYSTEM_PROMPT }, ...history, { role:"user", content:message } ];
  let iterations = 0, finalReply = "";
  try {
    while (iterations < maxIterations) {
      iterations++;
      const response = await client.chat.completions.create({ model, messages, tools:WINGMAN_TOOLS, tool_choice:"auto", stream:false, max_maxOutputs:2048 });
      const choice = response.choices?.[0];
      const msg    = choice?.message;
      const finish = choice?.finish_reason;
      if (!msg) break;
      messages.push(msg);
      if (finish === "stop" || !msg.tool_calls?.length) {
        finalReply = msg.content ?? "";
        if (onChunk && finalReply) {
          for (const maxOutput of (finalReply.match(/\S+\s*/g) ?? [])) {
            onChunk(maxOutput);
            await new Promise(r => setTimeout(r, 18));
          }
        }
        break;
      }
      const toolResults = [];
      for (const tc of (msg.tool_calls ?? [])) {
        const name = tc.function.name;
        let args = {};
        try { args = JSON.parse(tc.function.arguments ?? "{}"); } catch {}
        console.log(`[ai.agent] ↓ ${name}`, args);
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("ai:toolCall", { name, args });
        onToolCall?.({ name, args });
        const result = await executeTool(name, args, { mainWindow });
        console.log(`[ai.agent] ↑ ${name}`, result);
        toolResults.push({ role:"tool", tool_call_id:tc.id, content:JSON.stringify(result) });
      }
      messages.push(...toolResults);
    }
  } catch(err) {
    console.error("[ai.agent] runAgent error:", err.message);
    return { ok:false, error:err.message };
  }
  return { ok:true, reply:finalReply, iterations };
}

export function disconnectAgent(sessionId) {
  agentSessions.delete(sessionId);
  console.log(`[ai.agent] Session closed: ${sessionId}`);
  return { ok:true };
}
