import {
  Affix,
  Alert,
  Box,
  Button,
  Divider,
  Group,
  Notification,
  Select,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
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
import { chainIconUrl, protocolIconUrl } from './ui/icons.ts'
import { Mark } from './ui/Mark.tsx'
import { Markets } from './ui/Markets.tsx'
import { healthColor, Metrics } from './ui/Metrics.tsx'
import motion from './ui/motion.module.css'
import { Presence } from './ui/Presence.tsx'
import { marketPath, protocolIdFromPath, resolveRoute } from './ui/route.ts'

const protocols = protocolChoices()

type FetchNotice = {
  id: number
  title: string
  message: string
}

export default function App() {
  const { enabled: animationsEnabled, setEnabled: setAnimationsEnabled } = useAnimations()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
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

  const protocolMarkets = markets.filter((market) => market.protocolId === protocolId)
  const menuTransition = {
    transition: 'pop-top-left' as const,
    duration: animationsEnabled ? 180 : 0,
    exitDuration: animationsEnabled ? 120 : 0,
    timingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
  }

  function onProtocol(nextProtocol: string) {
    const nextMarket = markets.find((market) => market.protocolId === nextProtocol)
    if (!nextMarket) return
    navigate(marketPath(nextProtocol, nextMarket.name, view))
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
      <Group mih={56} py={8} w="100%" maw={1440} mx="auto" px="md" align="center" justify="space-between" wrap="wrap" gap="md">
        <Title order={1} fz={18} fw={700} lh={1} style={{ minWidth: 0 }}>
          Defi Lending Calculator
        </Title>
        <Group gap="md" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Switch
            className="animationsToggle"
            checked={colorScheme === 'light'}
            onChange={(event) => setColorScheme(event.currentTarget.checked ? 'light' : 'dark')}
            label="Light mode"
            size="sm"
            color="accent"
          />
          <Divider orientation="vertical" color="var(--mantine-color-default-border)" />
          <Switch
            className="animationsToggle"
            checked={animationsEnabled}
            onChange={(event) => setAnimationsEnabled(event.currentTarget.checked)}
            label="Animations"
            size="sm"
            color="accent"
          />
        </Group>
      </Group>
    </Box>
    <Box
      maw={1440}
      mx="auto"
      px="md"
      pt="lg"
      pb="xl"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <Stack gap="lg">
        <Group className={motion.enter} style={{ animationDelay: '40ms' }} align="flex-end" wrap="wrap">
            <Select
              label="Protocol"
              size="lg"
              comboboxProps={{ transitionProps: menuTransition }}
              data={protocols.map((protocol) => ({ value: protocol.id, label: protocol.label }))}
              value={protocolId}
              allowDeselect={false}
              styles={{
                label: {
                  fontSize: 'var(--mantine-font-size-lg)',
                  fontWeight: 700,
                  marginBottom: 'var(--mantine-spacing-sm)',
                },
              }}
              leftSection={<Mark src={protocolIconUrl(protocolId)} label={protocolId} size={18} />}
              leftSectionWidth={42}
              renderOption={({ option }) => (
                <Group gap="xs" wrap="nowrap">
                  <Mark src={protocolIconUrl(option.value)} label={option.label} size={18} />
                  <span>{option.label}</span>
                </Group>
              )}
              onChange={(value) => {
                if (value) onProtocol(value)
              }}
              w={240}
            />
            <Select
              label="Market"
              size="lg"
              maxDropdownHeight={640}
              comboboxProps={{ transitionProps: menuTransition }}
              data={protocolMarkets.map((market) => ({ value: market.id, label: market.name }))}
              value={marketId || null}
              allowDeselect={false}
              styles={{
                label: {
                  fontSize: 'var(--mantine-font-size-lg)',
                  fontWeight: 700,
                  marginBottom: 'var(--mantine-spacing-sm)',
                },
              }}
              leftSection={
                <Mark
                  src={chainIconUrl(protocolMarkets.find((market) => market.id === marketId)?.chainId ?? null)}
                  label={protocolMarkets.find((market) => market.id === marketId)?.name ?? 'Market'}
                  size={18}
                />
              }
              leftSectionWidth={42}
              renderOption={({ option }) => {
                const market = protocolMarkets.find((entry) => entry.id === option.value)
                return (
                  <Group gap="xs" wrap="nowrap">
                    <Mark src={chainIconUrl(market?.chainId ?? null)} label={option.label} size={18} />
                    <span>{option.label}</span>
                  </Group>
                )
              }}
              onChange={(value) => {
                if (!value) return
                const market = markets.find((entry) => entry.id === value)
                if (!market) return
                navigate(marketPath(market.protocolId, market.name, view))
                setEdits(emptyEdits())
              }}
              w={280}
            />
          </Group>

        <Tabs className={motion.enter} style={{ animationDelay: '55ms' }} value={view} onChange={onView} color="accent">
          <Tabs.List>
            <Tabs.Tab value="calculator">Calculator</Tabs.Tab>
            <Tabs.Tab value="markets">Markets</Tabs.Tab>
          </Tabs.List>
        </Tabs>

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
              styles={{
                label: {
                  fontSize: 'var(--mantine-font-size-lg)',
                  fontWeight: 700,
                  marginBottom: 'var(--mantine-spacing-sm)',
                },
              }}
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
          <Stack gap="md">
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
    </>
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

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="4.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.6 10.6 15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
