import { Config, Context } from 'https://edge.netlify.com/'

type RouteHandler = (
  req: Request,
  match: URLPatternResult,
  ctx: Context,
) => Response | Promise<Response>

interface Route {
  pattern: URLPattern
  method?: string | string[]
  handler: RouteHandler
}

const ROUTES: Route[] = [
  {
    pattern: new URLPattern({ pathname: '/' }),
    handler(_req, _match, ctx) {
      return new Response(ctx.ip)
    },
  },
  {
    pattern: new URLPattern({ pathname: '/geo' }),
    handler(_req, _match, { ip, geo, server }) {
      return Response.json({ ip, ...geo, server })
    },
  },
  {
    pattern: new URLPattern({ pathname: '/down/:n(\\d+):unit([km])?' }),
    handler(_req, { pathname: { groups } }) {
      let n = Number(groups.n) * (!groups.unit ? 1 : groups.unit === 'k' ? 1024 : 1024 * 1024)
      if (!(n <= 20 * 1024 * 1024)) return new Response('Not Found', { status: 404 })
      const bufSize = 65536
      const buf = new Uint8Array(bufSize).fill(97)
      return new Response(
        new ReadableStream({
          pull(controller) {
            if (controller.desiredSize === null) return
            do {
              if ((n -= bufSize) >= 0) {
                controller.enqueue(buf)
              } else {
                controller.enqueue(buf.subarray(0, n))
                controller.close()
                return
              }
            } while (controller.desiredSize > 0)
          },
        }),
        {
          headers: {
            'content-type': 'application/octet-stream',
            'content-length': `${n}`,
          },
        },
      )
    },
  },
]

export default (req: Request, ctx: Context) => {
  for (const route of ROUTES) {
    const match = route.pattern.exec(req.url)
    if (
      match &&
      (Array.isArray(route.method) ? route.method.includes(req.method) : req.method === (route.method ?? 'GET'))
    ) {
      return route.handler(req, match, ctx)
    }
  }
  return new Response('Not Found', { status: 404 })
}

export const config: Config = {
  path: '/*',
}
