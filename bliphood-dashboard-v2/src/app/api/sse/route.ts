import { NextRequest } from "next/server";
import { getSSEClients } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const clients = getSSEClients();

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
      "Access-Control-Allow-Origin": "*",
    },
  });
}
