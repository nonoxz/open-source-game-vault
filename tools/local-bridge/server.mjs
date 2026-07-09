import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const configPath = resolve(process.env.OSGV_BRIDGE_CONFIG ?? resolve(__dirname, 'local-bridge.config.json'))
const fallbackPort = Number(process.env.OSGV_BRIDGE_PORT ?? 45217)

function loadConfig() {
  if (!existsSync(configPath)) {
    return { port: fallbackPort, games: {} }
  }

  return JSON.parse(readFileSync(configPath, 'utf8'))
}

function send(res, statusCode, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Private-Network': 'true',
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(body)
}

function readJson(req) {
  return new Promise((resolveRead, rejectRead) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 10_000) {
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolveRead(JSON.parse(body || '{}'))
      } catch (error) {
        rejectRead(error)
      }
    })
    req.on('error', rejectRead)
  })
}

function launchGame(entry) {
  if (!entry || typeof entry.command !== 'string') {
    throw new Error('Juego sin comando configurado en local-bridge.config.json.')
  }

  const args = Array.isArray(entry.args) ? entry.args.map(String) : []
  const cwd = entry.cwd ? String(entry.cwd) : undefined
  const child = spawn(entry.command, args, {
    cwd,
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 200, {})
    return
  }

  const config = loadConfig()
  const games = config.games ?? {}

  if (req.method === 'GET' && req.url === '/status') {
    send(res, 200, {
      ok: true,
      configuredGames: Object.keys(games),
      configPath,
    })
    return
  }

  if (req.method === 'POST' && req.url === '/launch') {
    try {
      const { gameId } = await readJson(req)
      if (typeof gameId !== 'string' || !/^[a-z0-9-]+$/.test(gameId)) {
        send(res, 400, { message: 'gameId invalido.' })
        return
      }

      const entry = games[gameId]
      if (!entry) {
        send(res, 404, {
          message: `Configura "${gameId}" en tools/local-bridge/local-bridge.config.json antes de abrirlo localmente.`,
        })
        return
      }

      launchGame(entry)
      send(res, 200, { message: `Abriendo ${entry.label ?? gameId} con el motor local configurado.` })
    } catch (error) {
      send(res, 500, { message: error instanceof Error ? error.message : 'Error lanzando juego local.' })
    }
    return
  }

  send(res, 404, { message: 'Ruta no encontrada.' })
})

const config = loadConfig()
const port = Number(config.port ?? fallbackPort)

server.listen(port, '127.0.0.1', () => {
  console.log(`Open Source Game Vault bridge escuchando en http://127.0.0.1:${port}`)
  console.log(`Config: ${configPath}`)
})
