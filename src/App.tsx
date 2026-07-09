import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import {
  Archive,
  Building2,
  CheckCircle2,
  Crosshair,
  Download,
  ExternalLink,
  FileUp,
  Flame,
  FlaskConical,
  FolderUp,
  Gamepad2,
  HardDrive,
  Landmark,
  Orbit,
  Play,
  PlugZap,
  RadioTower,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Swords,
  Target,
  Terminal,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './App.css'
import { defaultGameId, games, type DownloadLink, type GameEntry, type RuntimeStatus } from './data/games'
import { deleteAsset, formatBytes, listAssets, saveAssets, type StoredAsset } from './lib/assetStore'

const BRIDGE_URL = 'http://127.0.0.1:45217'
const folderInputProps = { webkitdirectory: '', directory: '' } as Record<string, string>

type BridgeState = {
  online: boolean
  configuredGames: string[]
  message: string
}

type SetupLink = {
  label: string
  url: string
  detail: string
}

const statusLabel: Record<RuntimeStatus, string> = {
  ready: 'Runner incluido',
  adapter: 'Adaptador preparado',
  research: 'Investigacion abierta',
}

const statusCopy: Record<RuntimeStatus, string> = {
  ready: 'Este juego tiene un runner local en el sitio.',
  adapter: 'El sitio ya modela assets, descargas y permisos; falta enchufar el motor WASM.',
  research: 'Usalo con el puente local mientras se valida un runner web estable.',
}

const downloadKindLabel: Record<DownloadLink['kind'], string> = {
  engine: 'motor',
  'free-data': 'datos libres',
  guide: 'guia',
  source: 'codigo',
}

const gameIcons: Record<string, LucideIcon> = {
  doom: Flame,
  wolf3d: Crosshair,
  micropolis: Building2,
  quake: Orbit,
  cnc: RadioTower,
  homeworld: Rocket,
  pop: Swords,
  marathon: Landmark,
  duke3d: Target,
}

const gameCoverLabels: Record<string, string> = {
  doom: 'DOOM',
  wolf3d: 'WOLF',
  micropolis: 'CITY',
  quake: 'QUAKE',
  cnc: 'C&C',
  homeworld: 'HOME',
  pop: 'PRINCE',
  marathon: 'MTHON',
  duke3d: 'DUKE',
}

function byGameId(assets: StoredAsset[], gameId: string) {
  return assets.filter((asset) => asset.gameId === gameId)
}

function hasMatchingAsset(game: GameEntry, asset: StoredAsset) {
  return game.acceptedExtensions.some((extension) =>
    asset.name.toLowerCase().endsWith(extension.toLowerCase()),
  )
}

function githubArchiveUrl(url: string) {
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/?#]+)\/?$/)
  if (!match) return undefined
  return `https://github.com/${match[1]}/${match[2]}/archive/HEAD.zip`
}

function setupLinkFor(game: GameEntry): SetupLink {
  const freeData = game.downloadLinks.find((link) => link.kind === 'free-data')
  if (freeData) {
    return {
      label: 'Descargar kit legal',
      url: freeData.url,
      detail: freeData.label,
    }
  }

  const githubSource =
    game.downloadLinks.find((link) => link.kind === 'source' && githubArchiveUrl(link.url)) ??
    ({ label: 'Repositorio base', url: game.sourceUrl, kind: 'source' } satisfies DownloadLink)
  const githubZip = githubArchiveUrl(githubSource.url)
  if (githubZip) {
    return {
      label: 'Descargar repo base',
      url: githubZip,
      detail: githubSource.label,
    }
  }

  const engine = game.downloadLinks.find((link) => link.kind === 'engine') ?? game.downloadLinks[0]
  return {
    label: 'Abrir descarga',
    url: engine.url,
    detail: engine.label,
  }
}

function setupStepsFor(game: GameEntry, bridgeCanLaunch: boolean, hasAssets: boolean) {
  if (game.runMode === 'web-included') {
    return [
      'Este runner ya viene incluido en el sitio.',
      'Pulsa Jugar para reiniciar o volver a cargar la partida.',
      'Puedes subir archivos opcionales si el runner completo los soporta mas adelante.',
    ]
  }

  return [
    `Descarga el kit legal o repositorio base: ${setupLinkFor(game).detail}.`,
    hasAssets
      ? 'Ya hay archivos compatibles guardados en el vault local del navegador.'
      : `Sube los archivos esperados: ${game.requiredAssets.join(', ')}.`,
    bridgeCanLaunch
      ? 'El juego esta listo para abrirse con el motor local configurado.'
      : hasAssets
        ? 'Pulsa Jugar. Si el runner web aun no esta conectado, el sitio te avisara sin perder tus archivos.'
        : 'Cuando el archivo aparezca guardado, se activara el boton Jugar.',
  ]
}

function App() {
  const [activeId, setActiveId] = useState(defaultGameId)
  const [assets, setAssets] = useState<StoredAsset[]>([])
  const [launchTick, setLaunchTick] = useState(0)
  const [notice, setNotice] = useState('Vault listo. Selecciona un juego para revisar su runner.')
  const [bridge, setBridge] = useState<BridgeState>({
    online: false,
    configuredGames: [],
    message: 'Puente local no comprobado.',
  })

  const activeGame = games.find((game) => game.id === activeId) ?? games[0]
  const activeAssets = useMemo(() => byGameId(assets, activeGame.id), [assets, activeGame.id])
  const matchedAssets = activeAssets.filter((asset) => hasMatchingAsset(activeGame, asset))
  const totalStored = assets.reduce((sum, asset) => sum + asset.size, 0)
  const bridgeCanLaunch = bridge.online && bridge.configuredGames.includes(activeGame.id)
  const launchLabel =
    activeGame.runnerPath || matchedAssets.length > 0 ? 'Jugar' : bridgeCanLaunch ? 'Abrir local' : 'Preparar'

  useEffect(() => {
    listAssets()
      .then(setAssets)
      .catch(() => setNotice('No pude leer IndexedDB. Revisa permisos del navegador.'))
  }, [])

  useEffect(() => {
    checkBridge()
  }, [])

  async function checkBridge() {
    try {
      const response = await fetch(`${BRIDGE_URL}/status`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Bridge offline')
      const data = (await response.json()) as { configuredGames?: string[] }
      setBridge({
        online: true,
        configuredGames: data.configuredGames ?? [],
        message: 'Puente local conectado.',
      })
    } catch {
      setBridge({
        online: false,
        configuredGames: [],
        message: 'Puente local apagado. Ejecuta npm run bridge para abrir motores nativos.',
      })
    }
  }

  async function refreshAssets(message?: string) {
    const nextAssets = await listAssets()
    setAssets(nextAssets)
    if (message) setNotice(message)
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return

    await saveAssets(activeGame.id, files)
    await refreshAssets(`${files.length} archivo(s) guardado(s) para ${activeGame.title}.`)
  }

  async function handleDelete(assetId: string) {
    await deleteAsset(assetId)
    await refreshAssets('Archivo removido del vault local.')
  }

  async function handleLaunch() {
    setLaunchTick((value) => value + 1)
    if (activeGame.runnerPath) {
      setNotice(`Ejecutando runner local de ${activeGame.title}.`)
      return
    }

    if (!bridge.online) {
      if (matchedAssets.length > 0) {
        setNotice(
          `${activeGame.title} tiene archivos guardados. Falta conectar el motor web para que Jugar lo arranque dentro del navegador.`,
        )
      } else {
        setNotice(`Primero sube los archivos de ${activeGame.title}. Despues aparecera el flujo de juego.`)
      }
      return
    }

    try {
      const response = await fetch(`${BRIDGE_URL}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id }),
      })
      const data = (await response.json()) as { message?: string }
      if (!response.ok) throw new Error(data.message ?? 'No se pudo abrir el juego local.')
      setNotice(data.message ?? `Abriendo ${activeGame.title} con el puente local.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo abrir el juego local.')
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Catalogo de juegos">
        <div className="brand">
          <div className="brand-mark">
            <Gamepad2 size={22} aria-hidden="true" />
          </div>
          <div>
            <h1>Open Source Game Vault</h1>
            <p>Motores liberados, datos separados.</p>
          </div>
        </div>

        <a className="creator-link" href="https://github.com/nonoxz" target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          By nonoxz
        </a>

        <div className="catalog-summary">
          <span>{games.length} juegos</span>
          <span>{formatBytes(totalStored)} locales</span>
        </div>

        <nav className="game-list">
          {games.map((game) => {
            const gameAssets = byGameId(assets, game.id)
            const GameIcon = gameIcons[game.id] ?? Gamepad2
            return (
              <button
                className={game.id === activeGame.id ? 'game-row active' : 'game-row'}
                key={game.id}
                onClick={() => setActiveId(game.id)}
                type="button"
              >
                <span className={`game-cover ${game.id} ${game.runtimeStatus}`} aria-hidden="true">
                  <GameIcon size={18} />
                  <em>{gameCoverLabels[game.id] ?? game.title}</em>
                </span>
                <span>
                  <strong>{game.title}</strong>
                  <small>
                    {game.year} · {gameAssets.length} archivo(s)
                  </small>
                </span>
              </button>
            )
          })}
        </nav>
      </aside>

      <section className="runner-stage" aria-label="Runner">
        <header className="topbar">
          <div>
            <p className="section-label">Launcher</p>
            <h2>{activeGame.title}</h2>
            <a className="topbar-credit" href="https://github.com/nonoxz" target="_blank" rel="noreferrer">
              By nonoxz
            </a>
          </div>
          <div className="topbar-actions">
            <a className="icon-link" href={activeGame.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={17} aria-hidden="true" />
              Codigo
            </a>
            <button className="primary-action" type="button" onClick={handleLaunch}>
              <Play size={17} fill="currentColor" aria-hidden="true" />
              {launchLabel}
            </button>
          </div>
        </header>

        <Runner
          game={activeGame}
          assets={matchedAssets}
          bridgeCanLaunch={bridgeCanLaunch}
          onLaunch={handleLaunch}
          onUpload={handleUpload}
          launchTick={launchTick}
        />

        <section className="asset-dock" aria-label="Archivos locales">
          <div>
            <p className="section-label">Vault local</p>
            <h3>Archivos aportados por el usuario</h3>
          </div>
          <div className="asset-actions">
            <label className="upload-button">
              <FileUp size={17} aria-hidden="true" />
              Subir archivos
              <input
                multiple
                type="file"
                onChange={handleUpload}
                accept={activeGame.acceptedExtensions.join(',')}
              />
            </label>
            <label className="upload-button secondary-upload">
              <FolderUp size={17} aria-hidden="true" />
              Subir carpeta
              <input multiple type="file" onChange={handleUpload} {...folderInputProps} />
            </label>
          </div>
          <AssetList assets={activeAssets} onDelete={handleDelete} />
        </section>
      </section>

      <aside className="detail-panel" aria-label="Detalles del juego">
        <StatusCard game={activeGame} matchedCount={matchedAssets.length} />
        <DownloadBlock links={activeGame.downloadLinks} />
        <BridgeBlock bridge={bridge} game={activeGame} canLaunch={bridgeCanLaunch} onRefresh={checkBridge} />
        <InfoBlock icon={<ShieldCheck size={18} />} title="Limite legal">
          {activeGame.legalBoundary}
        </InfoBlock>
        <InfoBlock icon={<Archive size={18} />} title="Archivos esperados">
          <ul className="plain-list">
            {activeGame.requiredAssets.map((asset) => (
              <li key={asset}>{asset}</li>
            ))}
          </ul>
        </InfoBlock>
        <InfoBlock icon={<FlaskConical size={18} />} title="Siguiente paso tecnico">
          {activeGame.nextStep}
        </InfoBlock>
        <div className="notice" role="status">
          {notice}
        </div>
      </aside>
    </main>
  )
}

function Runner({
  game,
  assets,
  bridgeCanLaunch,
  onLaunch,
  onUpload,
  launchTick,
}: {
  game: GameEntry
  assets: StoredAsset[]
  bridgeCanLaunch: boolean
  onLaunch: () => void
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  launchTick: number
}) {
  if (game.runnerPath) {
    return (
      <div className="runner-frame-wrap">
        <iframe
          key={`${game.id}-${launchTick}`}
          title={`${game.title} runner`}
          src={game.runnerPath}
          sandbox="allow-scripts allow-popups"
        />
      </div>
    )
  }

  return (
    <div className="runner-placeholder">
      <div className="runner-grid" aria-hidden="true"></div>
      <div className="runner-message setup-message">
        <HardDrive size={34} aria-hidden="true" />
        <h3>{bridgeCanLaunch ? 'Listo para abrir localmente' : 'Preparar juego'}</h3>
        <p>{statusCopy[game.runtimeStatus]}</p>
        <SetupActions
          game={game}
          hasAssets={assets.length > 0}
          onLaunch={onLaunch}
          onUpload={onUpload}
        />
        <ol className="setup-instructions">
          {setupStepsFor(game, bridgeCanLaunch, assets.length > 0).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <code>{assets.length ? `${assets.length} archivo(s) compatible(s)` : 'sin archivos locales aun'}</code>
        <small className="legal-note">
          El sitio solo descarga codigo, motores o datos libres; si el juego exige archivos comerciales, debes
          aportarlos desde una copia legal.
        </small>
      </div>
    </div>
  )
}

function SetupActions({
  game,
  hasAssets,
  onLaunch,
  onUpload,
}: {
  game: GameEntry
  hasAssets: boolean
  onLaunch: () => void
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  const setupLink = setupLinkFor(game)

  return (
    <div className="setup-actions">
      {hasAssets ? (
        <button className="setup-play" type="button" onClick={onLaunch}>
          <Play size={18} fill="currentColor" aria-hidden="true" />
          <span>
            <strong>Jugar</strong>
            <small>Usar archivos cargados</small>
          </span>
        </button>
      ) : (
        <a className="setup-download" href={setupLink.url} target="_blank" rel="noreferrer">
          <Download size={18} aria-hidden="true" />
          <span>
            <strong>{setupLink.label}</strong>
            <small>{setupLink.detail}</small>
          </span>
        </a>
      )}
      <label className="setup-upload">
        <FileUp size={17} aria-hidden="true" />
        {hasAssets ? 'Cambiar archivo' : 'Subir archivos'}
        <input multiple type="file" onChange={onUpload} accept={game.acceptedExtensions.join(',')} />
      </label>
      <label className="setup-upload">
        <FolderUp size={17} aria-hidden="true" />
        Subir carpeta
        <input multiple type="file" onChange={onUpload} {...folderInputProps} />
      </label>
    </div>
  )
}

function DownloadBlock({ links }: { links: DownloadLink[] }) {
  return (
    <section className="info-block download-block">
      <h3>
        <Download size={18} aria-hidden="true" />
        Descargas legales
      </h3>
      <div className="download-list">
        {links.map((link) => (
          <a href={link.url} key={link.url} target="_blank" rel="noreferrer">
            <span>{link.label}</span>
            <small>{downloadKindLabel[link.kind]}</small>
          </a>
        ))}
      </div>
    </section>
  )
}

function BridgeBlock({
  bridge,
  game,
  canLaunch,
  onRefresh,
}: {
  bridge: BridgeState
  game: GameEntry
  canLaunch: boolean
  onRefresh: () => void
}) {
  return (
    <section className="info-block bridge-block">
      <h3>
        <PlugZap size={18} aria-hidden="true" />
        Ejecucion local
      </h3>
      <div className="bridge-status">
        <span className={bridge.online ? 'bridge-dot online' : 'bridge-dot'} aria-hidden="true" />
        <strong>{canLaunch ? 'Configurado para este juego' : bridge.message}</strong>
        <button type="button" onClick={onRefresh} aria-label="Revisar puente local">
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </div>
      {game.localLaunch ? (
        <dl className="launch-hints">
          <div>
            <dt>Motor recomendado</dt>
            <dd>{game.localLaunch.engine}</dd>
          </div>
          <div>
            <dt>Archivo/carpeta</dt>
            <dd>{game.localLaunch.assetHint}</dd>
          </div>
          <div>
            <dt>Ejemplo comando</dt>
            <dd>
              <Terminal size={14} aria-hidden="true" />
              <code>{game.localLaunch.commandHint}</code>
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  )
}

function AssetList({
  assets,
  onDelete,
}: {
  assets: StoredAsset[]
  onDelete: (assetId: string) => void
}) {
  if (!assets.length) {
    return <p className="empty-assets">No hay archivos guardados para este juego.</p>
  }

  return (
    <ul className="asset-list">
      {assets.map((asset) => (
        <li key={asset.id}>
          <span>
            <strong>{asset.name}</strong>
            <small>{formatBytes(asset.size)}</small>
          </span>
          <button type="button" onClick={() => onDelete(asset.id)} aria-label={`Eliminar ${asset.name}`}>
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function StatusCard({ game, matchedCount }: { game: GameEntry; matchedCount: number }) {
  const GameIcon = gameIcons[game.id] ?? Gamepad2

  return (
    <section className="status-card">
      <div className="status-card-head">
        <div className={`feature-icon ${game.runtimeStatus}`} aria-hidden="true">
          <GameIcon size={22} />
        </div>
        <div className={`status-badge ${game.runtimeStatus}`}>
          <CheckCircle2 size={16} aria-hidden="true" />
          {statusLabel[game.runtimeStatus]}
        </div>
      </div>
      <h3>{game.family}</h3>
      <p>{game.summary}</p>
      <dl>
        <div>
          <dt>Licencia motor</dt>
          <dd>{game.engineLicense}</dd>
        </div>
        <div>
          <dt>Assets coincidentes</dt>
          <dd>{matchedCount}</dd>
        </div>
      </dl>
    </section>
  )
}

function InfoBlock({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section className="info-block">
      <h3>
        {icon}
        {title}
      </h3>
      <div>{children}</div>
    </section>
  )
}

export default App
