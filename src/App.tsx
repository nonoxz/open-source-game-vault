import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import {
  Archive,
  Building2,
  CheckCircle2,
  Crosshair,
  ExternalLink,
  FileUp,
  Flame,
  FlaskConical,
  Gamepad2,
  HardDrive,
  Landmark,
  Orbit,
  Play,
  RadioTower,
  Rocket,
  ShieldCheck,
  Swords,
  Target,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './App.css'
import { defaultGameId, games, type GameEntry, type RuntimeStatus } from './data/games'
import { deleteAsset, formatBytes, listAssets, saveAssets, type StoredAsset } from './lib/assetStore'

const statusLabel: Record<RuntimeStatus, string> = {
  ready: 'Runner incluido',
  adapter: 'Adaptador preparado',
  research: 'Investigacion abierta',
}

const statusCopy: Record<RuntimeStatus, string> = {
  ready: 'Este juego tiene un runner local en el sitio.',
  adapter: 'El sitio ya modela assets y permisos; falta enchufar el motor WASM.',
  research: 'Conviene validar motor, assets y rendimiento antes de prometer ejecucion web.',
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

function App() {
  const [activeId, setActiveId] = useState(defaultGameId)
  const [assets, setAssets] = useState<StoredAsset[]>([])
  const [launchTick, setLaunchTick] = useState(0)
  const [notice, setNotice] = useState('Vault listo. Selecciona un juego para revisar su runner.')

  const activeGame = games.find((game) => game.id === activeId) ?? games[0]
  const activeAssets = useMemo(() => byGameId(assets, activeGame.id), [assets, activeGame.id])
  const matchedAssets = activeAssets.filter((asset) => hasMatchingAsset(activeGame, asset))
  const totalStored = assets.reduce((sum, asset) => sum + asset.size, 0)

  useEffect(() => {
    listAssets()
      .then(setAssets)
      .catch(() => setNotice('No pude leer IndexedDB. Revisa permisos del navegador.'))
  }, [])

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

  function handleLaunch() {
    setLaunchTick((value) => value + 1)
    if (activeGame.runnerPath) {
      setNotice(`Ejecutando runner local de ${activeGame.title}.`)
      return
    }
    setNotice(`Runner pendiente para ${activeGame.title}; assets y manifiesto quedan preparados.`)
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
              Fuente
            </a>
            <button className="primary-action" type="button" onClick={handleLaunch}>
              <Play size={17} fill="currentColor" aria-hidden="true" />
              Ejecutar
            </button>
          </div>
        </header>

        <Runner game={activeGame} assets={matchedAssets} launchTick={launchTick} />

        <section className="asset-dock" aria-label="Archivos locales">
          <div>
            <p className="section-label">Vault local</p>
            <h3>Assets aportados por el usuario</h3>
          </div>
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
          <AssetList assets={activeAssets} onDelete={handleDelete} />
        </section>
      </section>

      <aside className="detail-panel" aria-label="Detalles del juego">
        <StatusCard game={activeGame} matchedCount={matchedAssets.length} />
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
  launchTick,
}: {
  game: GameEntry
  assets: StoredAsset[]
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
      <div className="runner-message">
        <HardDrive size={34} aria-hidden="true" />
        <h3>Runner WASM pendiente</h3>
        <p>{statusCopy[game.runtimeStatus]}</p>
        <code>{assets.length ? `${assets.length} asset(s) listos` : 'sin assets locales aun'}</code>
      </div>
    </div>
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
