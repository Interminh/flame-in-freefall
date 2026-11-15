import { handleApi } from '../server/handlers.js'

export default function handler(req, res) {
  return handleApi('ext', req, res, process.env)
}
