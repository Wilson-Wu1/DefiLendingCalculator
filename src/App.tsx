import {
  ActionIcon,
  Affix,
  Alert,
  Box,
  Button,
  CopyButton,
  Divider,
  Group,
  Menu,
  Notification,
  Popover,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
  Transition,
  useMantineColorScheme,
} from '@mantine/core'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { adapterFor, loadMarkets, protocolChoices } from './adapters/registry.ts'
import { formatCompactNumber } from './domain/numbers.ts'
import { emptyEdits, type Edits, type Market, type Position } from './domain/types.ts'
import { hyperliquidAccountLabel } from './ui/accountMode.ts'
import { useAnimations } from './ui/animations.tsx'
import { Board } from './ui/Board.tsx'
import { Markets } from './ui/Markets.tsx'
import { healthColor, Metrics } from './ui/Metrics.tsx'
import caption from './ui/caption.module.css'
import motion from './ui/motion.module.css'
import { Presence } from './ui/Presence.tsx'
import { ProtocolMarket } from './ui/ProtocolMarket.tsx'
import { marketPath, protocolIdFromPath, resolveRoute } from './ui/route.ts'

const protocols = protocolChoices()

type FetchNotice = {
  id: number
  title: string
  message: string
}

export default function App() {
  const { enabled: animationsEnabled, setEnabled: setAnimationsEnabled } = useAnimations()
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const lightMode = colorScheme === 'light'

  useEffect(() => {
    document.getElementById('favicon')?.setAttribute('href', lightMode ? '/favicon-light.svg' : '/favicon.svg')
  }, [lightMode])
  const [markets, setMarkets] = useState<Market[]>([])
  const [pathname, navigate] = usePathname()
  const [position, setPosition] = useState<Position | null>(null)
  const [edits, setEdits] = useState<Edits>(emptyEdits())
  const [walletInput, setWalletInput] = useState('')
  const [loadedWallet, setLoadedWallet] = useState<string | null>(null)
  const [scenarioKey, setScenarioKey] = useState(0)
  const [loadGeneration, setLoadGeneration] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<FetchNotice | null>(null)
  const notifiedGeneration = useRef(0)
  const loadKind = useRef<'loaded' | 'refreshed'>('loaded')

  useEffect(() => {
    let cancelled = false
    loadMarkets()
      .then((list) => {
        if (!cancelled) setMarkets(list)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load markets.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const route = useMemo(
    () => (markets.length > 0 ? resolveRoute(pathname, markets) : null),
    [markets, pathname],
  )
  const protocolId = route?.protocolId ?? protocolIdFromPath(pathname) ?? protocols[0]?.id ?? 'aave-v3'
  const marketId = route?.marketId ?? ''
  const view = route?.view ?? 'calculator'

  useEffect(() => {
    if (!route || pathname === route.canonical) return
    navigate(route.canonical, 'replace')
  }, [route, pathname, navigate])

  useEffect(() => {
    const market = markets.find((entry) => entry.id === marketId)
    if (!market) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setEdits(emptyEdits())
    const adapter = adapterFor(market.protocolId)
    const wallet = loadedWallet
    const generation = loadGeneration
    const kind = loadKind.current
    const request = wallet ? adapter.position(wallet, market) : adapter.blank(market)
    request
      .then((next) => {
        if (cancelled) return
        setPosition(next)
        if (wallet && generation > 0 && notifiedGeneration.current !== generation) {
          notifiedGeneration.current = generation
          const short = shortenAddress(wallet)
          const account = hyperliquidAccountLabel(next)
          const typeNote = account ? ` Account type: ${account}.` : ''
          setNotice({
            id: generation,
            title: kind === 'refreshed' ? 'Refreshed' : 'Address loaded',
            message:
              kind === 'refreshed'
                ? `Fetched the latest data for ${short}.${typeNote}`
                : `Fetched ${short}.${typeNote}`,
          })
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setPosition(null)
          setError(reason instanceof Error ? reason.message : 'Could not load this market.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [marketId, loadedWallet, markets, loadGeneration])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const visible = position && position.marketId === marketId ? position : null
  const accountLabel = hyperliquidAccountLabel(visible)
  const result = useMemo(() => {
    if (!visible) return null
    return adapterFor(visible.protocolId).simulate(visible, edits)
  }, [visible, edits])

  function onProtocol(nextProtocol: string) {
    const nextMarket = markets.find((market) => market.protocolId === nextProtocol && !market.disabled)
    if (!nextMarket) return
    navigate(marketPath(nextProtocol, nextMarket.name, view))
    setEdits(emptyEdits())
  }

  function onMarket(nextId: string) {
    const market = markets.find((entry) => entry.id === nextId)
    if (!market || market.disabled || market.id === marketId) return
    navigate(marketPath(market.protocolId, market.name, view))
    setEdits(emptyEdits())
  }

  function onView(next: string | null) {
    if (next !== 'calculator' && next !== 'markets') return
    const market = markets.find((entry) => entry.id === marketId)
    if (!market) return
    navigate(marketPath(market.protocolId, market.name, next))
  }

  function onSearch(event: FormEvent) {
    event.preventDefault()
    const value = walletInput.trim()
    if (!value) {
      setLoadedWallet(null)
      setError(null)
      return
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
      setError('Enter a 0x wallet address.')
      return
    }
    setError(null)
    loadKind.current = loadedWallet?.toLowerCase() === value.toLowerCase() ? 'refreshed' : 'loaded'
    setLoadedWallet(value)
    setLoadGeneration((current) => current + 1)
  }

  function resetScenario() {
    setEdits(emptyEdits())
    setScenarioKey((current) => current + 1)
    setLoadedWallet(null)
    setWalletInput('')
    setError(null)
  }

  function patch(
    key: 'suppliedByAsset' | 'borrowedByAsset' | 'priceUsdByAsset' | 'liquidationThresholdByAsset',
    assetId: string,
    value: string,
  ) {
    setEdits((current) => ({
      ...current,
      [key]: { ...current[key], [assetId]: value },
    }))
  }

  return (
    <>
    <Box
      component="header"
      className={motion.enter}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 200,
        background: 'var(--mantine-color-body)',
        borderBottom: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Box className="topNav">
        <Box className="topNavBrand">
          <svg className="healthArc" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#1c1f23" />
            <path
              d="M9.2 21.2a8.1 8.1 0 1 1 13.6 0"
              fill="none"
              stroke="#50d2c1"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </svg>
          <Title className="topNavTitle" order={1} fz={22} fw={600} lh={1}>
            Defi Lending
          </Title>
        </Box>
        <Tabs className="navTabs" value={view} onChange={onView} color="accent">
          <Tabs.List>
            <Tabs.Tab value="calculator">Calculator</Tabs.Tab>
            <Tabs.Tab value="markets">Markets</Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <Group className="topNavTools" gap="md" wrap="nowrap" align="center">
          <ThemeToggle light={lightMode} onToggle={toggleColorScheme} />
          <Divider orientation="vertical" color="var(--mantine-color-default-border)" />
          <AnimationsToggle enabled={animationsEnabled} onChange={setAnimationsEnabled} />
        </Group>
        <div className="topNavSettings">
          <Menu
            position="bottom-end"
            width={220}
            offset={8}
            transitionProps={{
              transition: 'pop-top-right',
              duration: animationsEnabled ? 180 : 0,
              exitDuration: animationsEnabled ? 120 : 0,
              timingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <Menu.Target>
              <ActionIcon className="iconToggle" variant="subtle" color="gray" aria-label="Settings">
                <SettingsIcon />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown className="settingsMenu">
              <div className="settingsRow">
                <span className="settingsLabel">Light mode</span>
                <ThemeToggle light={lightMode} onToggle={toggleColorScheme} />
              </div>
              <AnimationsToggle enabled={animationsEnabled} labelPosition="left" onChange={setAnimationsEnabled} />
            </Menu.Dropdown>
          </Menu>
        </div>
      </Box>
    </Box>
    <Box
      component="main"
      maw={1440}
      mx="auto"
      pt={48}
      pb="xl"
      style={{ flex: '1 0 auto', fontVariantNumeric: 'tabular-nums', paddingInline: 'var(--page-gutter)' }}
    >
      <Stack gap="lg">
        <div className={motion.enter} style={{ animationDelay: '40ms' }}>
          <ProtocolMarket
            markets={markets}
            protocolId={protocolId}
            marketId={marketId}
            animations={animationsEnabled}
            onProtocol={onProtocol}
            onMarket={onMarket}
          />
        </div>

        {view === 'calculator' ? (
        <>
        <form className={motion.enter} style={{ animationDelay: '70ms' }} onSubmit={onSearch}>
          <Group align="flex-end" wrap="wrap">
            <TextInput
              label="Wallet"
              placeholder="Wallet address, optional"
              aria-label="Wallet address"
              value={walletInput}
              spellCheck={false}
              onChange={(event) => setWalletInput(event.currentTarget.value)}
              classNames={{ label: caption.caption }}
              styles={{ input: { backgroundColor: 'var(--hc-segment)', borderColor: 'transparent' } }}
              style={{ flex: '1 1 280px' }}
            />
            <Button type="submit" loading={loading} leftSection={<SearchIcon />}>
              Search
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={resetScenario}
              disabled={!visible && !loadedWallet && walletInput.trim() === ''}
              styles={{ root: { border: 0 } }}
            >
              Reset scenario
            </Button>
          </Group>
        </form>

        <Divider my="lg" />

        <Presence present={accountLabel !== null}>
          <Text c="dimmed" size="sm">
            Account type: {accountLabel}
          </Text>
        </Presence>

        <Presence present={loading}>
          <Text className={motion.loading} c="dimmed" size="sm">
            Loading market data…
          </Text>
        </Presence>
        <Presence present={error !== null}>
          <Alert color="red" variant="light" role="alert">
            {error}
          </Alert>
        </Presence>
        <Presence present={visible?.verified === false}>
          <Alert color="yellow" variant="light" role="alert">
            The local health factor does not match the protocol account view. Model{' '}
            <Text span fw={700} c={healthColor(result)}>
              {formatLoadedHealth(visible?.modelHealthFactor ?? null, visible?.healthUnit ?? 'ratio')}
            </Text>
            , protocol{' '}
            <Text span fw={700}>
              {formatLoadedHealth(visible?.protocolHealthFactor ?? null, visible?.healthUnit ?? 'ratio')}
            </Text>
            . The scenario still runs, but the model is unverified for this position.
          </Alert>
        </Presence>

        <Metrics position={visible} result={result} edits={edits} />
        <Board
          key={`${marketId}:${loadedWallet ?? ''}:${scenarioKey}:${loadGeneration}`}
          position={visible}
          protocolId={protocolId}
          chainId={markets.find((market) => market.id === marketId)?.chainId ?? null}
          edits={edits}
          onAmount={(side, assetId, value) => patch(side, assetId, value)}
          onPrice={(assetId, value) => patch('priceUsdByAsset', assetId, value)}
          onThreshold={(assetId, value) => patch('liquidationThresholdByAsset', assetId, value)}
        />
        <Text className={motion.enter} style={{ animationDelay: '300ms' }} c="dimmed" size="sm">
          Simulation only. Changing a price or a balance does not send a transaction.
        </Text>
        </>
        ) : (
          <Stack gap="md" w="100%">
            <Presence present={loading}>
              <Text className={motion.loading} c="dimmed" size="sm">
                Loading market data…
              </Text>
            </Presence>
            <Presence present={error !== null}>
              <Alert color="red" variant="light" role="alert">
                {error}
              </Alert>
            </Presence>
            <Markets
              position={visible}
              protocolId={protocolId}
              chainId={markets.find((market) => market.id === marketId)?.chainId ?? null}
            />
          </Stack>
        )}
      </Stack>
      <Toast notice={notice} animations={animationsEnabled} onClose={() => setNotice(null)} />
    </Box>
    <Footer />
    </>
  )
}

const GITHUB_URL = 'https://github.com/Wilson-Wu1/DefiLendingCalculator'

const DONATION_ADDRESSES = [
  { chain: 'EVM', address: '0x4a1445b35c1AAa7ec0f495e06a4d40902bCb4D01' },
  { chain: 'BTC', address: 'bc1q2lye7w0cgc3wsge97qjfalswd3tw8r6flzl3zu' },
  { chain: 'Solana', address: '69paGVDawscPpRm9yTFzxJhcpxyysZSqsucDM1eX99j1' },
]

function Footer() {
  return (
    <Box component="footer" className="siteFooter">
      <div className="siteFooterInner">
        <Text c="dimmed" size="sm">
          Defi Lending Calculator
        </Text>
        <nav className="footerLinks" aria-label="Social links">
          <a className="footerLink" href={GITHUB_URL} target="_blank" rel="noreferrer">
            <GitHubIcon />
            GitHub
          </a>
          <Popover width={280} position="top-end" offset={8} withArrow shadow="md">
            <Popover.Target>
              <button type="button" className="footerLink">
                <DonateIcon />
                Donate
              </button>
            </Popover.Target>
            <Popover.Dropdown>
              <Text size="sm" fw={650}>
                Donate
              </Text>
              <div className="donateList">
                {DONATION_ADDRESSES.map((entry) => (
                  <div key={entry.chain} className="donateRow">
                    <Text size="xs" c="dimmed">
                      {entry.chain}
                    </Text>
                    <Text className="donateAddress" size="sm" title={entry.address}>
                      {shortenAddress(entry.address)}
                    </Text>
                    <CopyButton value={entry.address} timeout={1600}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow position="top" openDelay={300}>
                          <ActionIcon
                            variant="subtle"
                            color={copied ? 'accent' : 'gray'}
                            size="sm"
                            aria-label={copied ? `Copied ${entry.chain} address` : `Copy ${entry.chain} address`}
                            onClick={copy}
                          >
                            {copied ? <CheckIcon /> : <CopyIcon />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </div>
                ))}
              </div>
            </Popover.Dropdown>
          </Popover>
        </nav>
      </div>
    </Box>
  )
}

function Toast({
  notice,
  animations,
  onClose,
}: {
  notice: FetchNotice | null
  animations: boolean
  onClose: () => void
}) {
  const latest = useRef<FetchNotice | null>(null)
  if (notice) latest.current = notice
  const toast = notice ?? latest.current
  if (!toast) return null

  return (
    <Affix position={{ bottom: 20, right: 20 }} zIndex={400}>
      <Transition
        mounted={notice !== null}
        transition="slide-up"
        duration={animations ? 280 : 0}
        timingFunction="cubic-bezier(0.22, 1, 0.36, 1)"
      >
        {(styles) => (
          <Notification
            style={{ ...styles, boxShadow: 'var(--hc-shadow)' }}
            w={320}
            color="accent"
            radius="md"
            withBorder
            icon={<FetchedIcon />}
            title={toast.title}
            onClose={onClose}
            role="status"
          >
            {toast.message}
          </Notification>
        )}
      </Transition>
    </Affix>
  )
}

function usePathname(): [string, (next: string, mode?: 'push' | 'replace') => void] {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const navigate = useCallback((next: string, mode: 'push' | 'replace' = 'push') => {
    if (window.location.pathname === next) return
    if (mode === 'replace') window.history.replaceState(null, '', next)
    else window.history.pushState(null, '', next)
    setPathname(next)
  }, [])
  return [pathname, navigate]
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function ThemeToggle({ light, onToggle }: { light: boolean; onToggle: () => void }) {
  return (
    <ActionIcon
      className="iconToggle"
      variant="subtle"
      color="gray"
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-pressed={light}
      onClick={onToggle}
    >
      <span className="themeIcons" data-scheme={light ? 'light' : 'dark'}>
        <SunIcon />
        <MoonIcon />
      </span>
    </ActionIcon>
  )
}

function AnimationsToggle({
  enabled,
  labelPosition = 'right',
  onChange,
}: {
  enabled: boolean
  labelPosition?: 'left' | 'right'
  onChange: (enabled: boolean) => void
}) {
  return (
    <Switch
      className="animationsToggle"
      checked={enabled}
      onChange={(event) => onChange(event.currentTarget.checked)}
      label="Animations"
      labelPosition={labelPosition}
      size="sm"
      color="accent"
    />
  )
}

function SunIcon() {
  return (
    <svg className="themeSun" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="3.1" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9 1.7v1.7M9 14.6v1.7M1.7 9h1.7M14.6 9h1.7M3.75 3.75l1.2 1.2M13.05 13.05l1.2 1.2M14.25 3.75l-1.2 1.2M4.95 13.05l-1.2 1.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="themeMoon" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M14.8 11.35A5.9 5.9 0 0 1 6.65 3.2 5.9 5.9 0 1 0 14.8 11.35Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.2 3.2h3.6l.45 2.15a6.8 6.8 0 0 1 1.85 1.05l2.05-.95 1.8 3.1-1.6 1.55a6.9 6.9 0 0 1 0 2.2l1.6 1.55-1.8 3.1-2.05-.95a6.8 6.8 0 0 1-1.85 1.05l-.45 2.15h-3.6l-.45-2.15a6.8 6.8 0 0 1-1.85-1.05l-2.05.95-1.8-3.1 1.6-1.55a6.9 6.9 0 0 1 0-2.2L3.9 8.55l1.8-3.1 2.05.95a6.8 6.8 0 0 1 1.85-1.05l.6-2.15Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="4.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.6 10.6 15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.7 7.7 0 0 1 8 5.06c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

function DonateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 13.15 2.85 8.15a2.95 2.95 0 0 1 4.17-4.17L8 4.96l.98-.98a2.95 2.95 0 0 1 4.17 4.17L8 13.15Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="4.4" y="4.4" width="7.2" height="7.2" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M9.2 4.2V3.1A1.1 1.1 0 0 0 8.1 2H3.1A1.1 1.1 0 0 0 2 3.1v5A1.1 1.1 0 0 0 3.1 9.2h1.1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 7.2 5.6 9.8 11 4.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FetchedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M4 9.2 7.2 12.5 14 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatLoadedHealth(value: string | null, unit: 'ratio' | 'percent'): string {
  if (value === null) return '∞'
  const text = formatCompactNumber(value, 2)
  return unit === 'percent' ? `${text}%` : text
}
