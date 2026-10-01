import { app, requestForApp } from '../../server/app.ts'

export default function handler(request: Request): Promise<Response> {
  return app.fetch(requestForApp(request))
}
