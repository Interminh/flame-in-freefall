import { handleApi } from '../server/handlers.js'

export default function handler(req, res) {
  return handleApi('status', req, res, process.env)
}
