import { NextRequest } from "next/server";
import { getSSEClients } from "@/lib/store";

export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = ["bliphood.vercel.app", "localhost"];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  try {
    const hostname = new URL(origin).hostname;
    return ALLOWED_ORIGINS.some((o) => hostname === o || hostname.endsWith("." + o));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && !isOriginAllowed(origin)) {
    return new Response("unauthorized", { status: 403 });
  }

  const clients = getSSEClients();
  if (clients.size >= 100) {
    return new Response("too many connections", { status: 503 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try { controller.enqueue(encoder.encode(data)); } catch { clients.delete(send); }
      };

      clients.add(send);

      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ connected: true, timestamp: Date.now() })}\n\n`));

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`)); } catch { clearInterval(heartbeat); }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        clients.delete(send);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": origin || "https://bliphood.vercel.app",
    },
  });
}
