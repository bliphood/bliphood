import { NextRequest } from "next/server";
import { getSSEClients } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clients = getSSEClients();
  if (clients.size >= 50) {
    return new Response("too many connections", { status: 503 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try { controller.enqueue(encoder.encode(data)); } catch { clients.delete(send); }
      };
      clients.add(send);
      controller.enqueue(encoder.encode(`event: connected\ndata: {"connected":true}\n\n`));
      req.signal.addEventListener("abort", () => clients.delete(send));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
