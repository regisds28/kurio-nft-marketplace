import { EDITORIAL_POSTS } from '../seed'
import { route, HttpResponse } from '../route'

export const editorialHandlers = [
  route('GET', '/api/editorial/posts', () => HttpResponse.json({ items: EDITORIAL_POSTS })),
]
