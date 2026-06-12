// SSE subscriber registry is module-level (single-process dev pattern).
// Production upgrade path: replace addSubscriber/removeSubscriber with a
// Redis pub/sub channel; this handler's streaming logic stays identical.
import { addSubscriber, removeSubscriber } from '@/lib/hcm/mock-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()

  let ctrl: ReadableStreamDefaultController

  const stream = new ReadableStream({
    start(controller) {
      ctrl = controller
      addSubscriber(controller)
      controller.enqueue(encoder.encode(': connected\n\n'))
    },
    cancel() {
      removeSubscriber(ctrl)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
