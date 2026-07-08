export type RuntimeStatus = 'ready' | 'adapter' | 'research'

export type GameEntry = {
  id: string
  title: string
  year: string
  family: string
  runtimeStatus: RuntimeStatus
  engineLicense: string
  sourceUrl: string
  runnerPath?: string
  summary: string
  legalBoundary: string
  requiredAssets: string[]
  acceptedExtensions: string[]
  nextStep: string
}

export const games: GameEntry[] = [
  {
    id: 'doom',
    title: 'Doom / Freedoom',
    year: '1993',
    family: 'FPS raycast/BSP',
    runtimeStatus: 'adapter',
    engineLicense: 'GPL source ports',
    sourceUrl: 'https://github.com/id-Software/DOOM',
    summary:
      'Best first real target. The launcher can use free Freedoom data or user-provided commercial WAD files.',
    legalBoundary:
      'The original engine source is available, but commercial WAD data is not bundled here.',
    requiredAssets: ['freedoom2.wad or doom.wad', 'optional config/save files'],
    acceptedExtensions: ['.wad'],
    nextStep: 'Connect a Chocolate Doom or wasm-doom build to the runner slot.',
  },
  {
    id: 'wolf3d',
    title: 'Wolfenstein 3D',
    year: '1992',
    family: 'Pseudo-3D raycasting',
    runtimeStatus: 'adapter',
    engineLicense: 'GPL engine source',
    sourceUrl: 'https://github.com/id-Software/wolf3d-browser',
    summary:
      'A browser-oriented source release exists, making this a practical early adapter.',
    legalBoundary:
      'The browser source does not grant redistribution rights for the original game data.',
    requiredAssets: ['*.wl6 or shareware data files', 'audio and map data'],
    acceptedExtensions: ['.wl6', '.sod', '.sdm', '.bin', '.dat'],
    nextStep: 'Import wolf3d-browser as a runner and map local assets into its data loader.',
  },
  {
    id: 'micropolis',
    title: 'Micropolis',
    year: '1989 / 2008',
    family: 'City simulation',
    runtimeStatus: 'ready',
    engineLicense: 'GPL-3.0',
    sourceUrl: 'https://github.com/SimHacker/micropolis',
    runnerPath: '/runners/micropolis/index.html',
    summary:
      'The cleanest legal fit: the SimCity-derived code was released as Micropolis under GPL.',
    legalBoundary:
      'Use Micropolis naming and assets; avoid the SimCity trademark and commercial packaging.',
    requiredAssets: ['none for the built-in planning sandbox'],
    acceptedExtensions: ['.cty', '.json'],
    nextStep: 'Replace the sandbox with the official Micropolis web build once compiled.',
  },
  {
    id: 'quake',
    title: 'Quake I / II / III',
    year: '1996-1999',
    family: 'True 3D engines',
    runtimeStatus: 'research',
    engineLicense: 'GPL engine releases',
    sourceUrl: 'https://github.com/id-Software',
    summary:
      'Great preservation target, but the engines and asset layouts differ substantially per game.',
    legalBoundary:
      'Engine code is open; original PAK/PK3 assets are user-provided and should not be redistributed.',
    requiredAssets: ['pak0.pak / pak1.pak', 'baseq2/*.pak', 'baseq3/*.pk3'],
    acceptedExtensions: ['.pak', '.pk3', '.cfg'],
    nextStep: 'Start with ioquake3 or a Quake 2 Emscripten port in its own isolated runner.',
  },
  {
    id: 'cnc',
    title: 'Command & Conquer / Red Alert',
    year: '1995-1996',
    family: 'Real-time strategy',
    runtimeStatus: 'research',
    engineLicense: 'GPL code drops and community engines',
    sourceUrl:
      'https://www.ea.com/games/command-and-conquer/command-and-conquer-remastered/news/steam-workshop-support',
    summary:
      'Promising, but web execution likely needs an OpenRA-style path or a remote runtime.',
    legalBoundary:
      'Code and library releases do not automatically make all original media redistributable.',
    requiredAssets: ['mix archives', 'maps', 'rules files'],
    acceptedExtensions: ['.mix', '.ini', '.map'],
    nextStep: 'Prototype an OpenRA-backed adapter or server-side streamed session.',
  },
  {
    id: 'homeworld',
    title: 'Homeworld',
    year: '1999',
    family: '3D space strategy',
    runtimeStatus: 'research',
    engineLicense: 'Source release / community ports',
    sourceUrl: 'https://github.com/HomeworldSDL/HomeworldSDL',
    summary:
      'There is a browser-oriented SDL path, but it expects original purchased data.',
    legalBoundary:
      'The runner should ask the user for Homeworld.big or equivalent legal game data.',
    requiredAssets: ['Homeworld.big', 'settings profile'],
    acceptedExtensions: ['.big', '.json', '.cfg'],
    nextStep: 'Test HomeworldSDL under Emscripten and wire its file preloader.',
  },
  {
    id: 'pop',
    title: 'Prince of Persia',
    year: '1989',
    family: 'Cinematic platformer',
    runtimeStatus: 'adapter',
    engineLicense: 'Historical source publication',
    sourceUrl: 'https://github.com/jmechner/Prince-of-Persia-Apple-II',
    summary:
      'Excellent educational entry. A practical browser runner should use a modern reimplementation such as SDLPoP.',
    legalBoundary:
      'The Apple II source is historically available, but full game redistribution remains a separate rights question.',
    requiredAssets: ['SDLPoP data folder or compatible package'],
    acceptedExtensions: ['.dat', '.bin', '.data', '.wasm'],
    nextStep: 'Attach the existing SDLPoP Emscripten output as a sandboxed runner.',
  },
  {
    id: 'marathon',
    title: 'Marathon Trilogy',
    year: '1994-1996',
    family: 'Sci-fi FPS',
    runtimeStatus: 'adapter',
    engineLicense: 'GPL Aleph One engine',
    sourceUrl: 'https://alephone.lhowon.org/',
    summary:
      'Aleph One keeps the trilogy playable and is a strong preservation candidate.',
    legalBoundary:
      'Confirm which scenario files can be mirrored versus linked or user-imported.',
    requiredAssets: ['scenario files', 'map/image/sound packages'],
    acceptedExtensions: ['.scea', '.shpA', '.sndA', '.zip'],
    nextStep: 'Investigate Aleph One wasm status and scenario packaging.',
  },
  {
    id: 'duke3d',
    title: 'Duke Nukem 3D',
    year: '1996',
    family: 'Build engine FPS',
    runtimeStatus: 'adapter',
    engineLicense: 'GPL engine/source-port ecosystem',
    sourceUrl: 'https://www.eduke32.com/',
    summary:
      'EDuke32 is the practical modern target, with the original GRP supplied by the user.',
    legalBoundary:
      'The Build/engine source is separate from the commercial Duke3D data archive.',
    requiredAssets: ['DUKE3D.GRP', 'optional user maps/mods'],
    acceptedExtensions: ['.grp', '.map', '.con'],
    nextStep: 'Compile an EDuke32 or compatible runtime to WebAssembly.',
  },
]

export const defaultGameId = 'micropolis'
