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
