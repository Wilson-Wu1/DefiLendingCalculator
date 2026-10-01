import { Menu, SegmentedControl, Tooltip } from '@mantine/core'
import { useState } from 'react'
import { protocolChoices } from '../adapters/registry.ts'
import type { Market } from '../domain/types.ts'
import { chainIconUrl, marketIconUrl, protocolIconUrl } from './icons.ts'
import { Mark } from './Mark.tsx'
import caption from './caption.module.css'
import styles from './ProtocolMarket.module.css'

const protocols = protocolChoices()

export function ProtocolMarket({
  markets,
  protocolId,
  marketId,
  animations,
  onProtocol,
  onMarket,
}: {
  markets: Market[]
  protocolId: string
  marketId: string
  animations: boolean
  onProtocol: (protocolId: string) => void
  onMarket: (marketId: string) => void
}) {
  const protocolMarkets = markets.filter((market) => market.protocolId === protocolId)
  const selected = protocolMarkets.find((market) => market.id === marketId) ?? null
  const menuTransition = {
    transition: 'pop-top-left' as const,
    duration: animations ? 180 : 0,
    exitDuration: animations ? 120 : 0,
    timingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
  }

  return (
    <div className={styles.pair}>
      <div>
        <span className={caption.caption} id="protocol-label">
          Protocol
        </span>
        <SegmentedControl
          className={styles.protocol}
          aria-labelledby="protocol-label"
          value={protocolId}
          onChange={onProtocol}
          data={protocols.map((protocol) => ({
            value: protocol.id,
            label: (
              <span className={styles.segmentLabel}>
                <Mark src={protocolIconUrl(protocol.id)} label={protocol.label} size={18} />
                {protocol.label}
              </span>
            ),
          }))}
        />
      </div>
      <div className={styles.market}>
        <span className={caption.caption} id="market-label">
          Market
        </span>
        {protocolId === 'hyperliquid' ? (
          <Tooltip
            label="Native HyperCore lending is the only Hyperliquid market this website currently supports."
            multiline
            maw={280}
            withArrow
            position="bottom-start"
          >
            <div className={styles.marketStatic}>
              <Mark src={chainIconUrl(selected?.chainId ?? null)} label={selected?.name ?? 'HyperCore'} size={18} />
              <span id="market-value">{selected?.name ?? 'HyperCore'}</span>
            </div>
          </Tooltip>
        ) : (
          <MarketMenu
            markets={protocolMarkets}
            selected={selected}
            transitionProps={menuTransition}
            onMarket={onMarket}
          />
        )}
      </div>
    </div>
  )
}

function MarketMenu({
  markets,
  selected,
  transitionProps,
  onMarket,
}: {
  markets: Market[]
  selected: Market | null
  transitionProps: {
    transition: 'pop-top-left'
    duration: number
    exitDuration: number
    timingFunction: string
  }
  onMarket: (marketId: string) => void
}) {
  const [query, setQuery] = useState('')
  const sections = marketSections(markets, query)
  return (
    <Menu
      position="bottom-start"
      width="min(680px, calc(100vw - 32px))"
      offset={6}
      transitionProps={transitionProps}
      onClose={() => setQuery('')}
    >
      <Menu.Target>
        <button type="button" className={styles.menuButton} aria-labelledby="market-label market-value">
          <Mark
            src={marketIconUrl(selected?.id ?? '', selected?.chainId ?? null)}
            label={selected?.name ?? 'Market'}
            size={18}
          />
          <span id="market-value">{selected?.name ?? 'Market'}</span>
          <Chevron />
        </button>
      </Menu.Target>
      <Menu.Dropdown className={styles.menu}>
        <label className={styles.search}>
          <SearchIcon />
          <input
            value={query}
            placeholder="Search markets..."
            aria-label="Search markets"
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => event.stopPropagation()}
          />
        </label>
        <div className={styles.body}>
          {sections.length === 0 ? (
            <p className={styles.empty}>No markets match.</p>
          ) : (
            sections.map((section) => (
              <section key={section.id} className={styles.section}>
                <h3 className={styles.sectionLabel}>{section.title}</h3>
                <div className={styles.grid}>
                  {section.markets.map((market) => (
                    <Menu.Item
                      key={market.id}
                      className={market.id === selected?.id ? `${styles.cell} ${styles.cellSelected}` : styles.cell}
                      leftSection={<Mark src={marketIconUrl(market.id, market.chainId)} label={market.name} size={22} />}
                      onClick={() => onMarket(market.id)}
                    >
                      {menuLabel(market.name)}
                    </Menu.Item>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </Menu.Dropdown>
    </Menu>
  )
}

const ethereumOrder = [
  'aave-v3-ethereum',
  'aave-v3-ethereum-prime',
  'aave-v3-ethereum-etherfi',
  'aave-v3-ethereum-horizon',
]

const l1Order = ['aave-v3-avalanche', 'aave-v3-bnb', 'aave-v3-gnosis', 'aave-v3-sonic']

const l2Order = [
  'aave-v3-base',
  'aave-v3-arbitrum',
  'aave-v3-mantle',
  'aave-v3-ink',
  'aave-v3-polygon',
  'aave-v3-linea',
  'aave-v3-optimism',
  'aave-v3-celo',
  'aave-v3-scroll',
  'aave-v3-zksync',
  'aave-v3-metis',
  'aave-v3-soneium',
]

function marketSections(markets: Market[], query: string): Array<{ id: string; title: string; markets: Market[] }> {
  const needle = query.trim().toLowerCase()
  const visible = needle
    ? markets.filter((market) => menuLabel(market.name).toLowerCase().includes(needle) || market.name.toLowerCase().includes(needle))
    : markets
  const sections = [
    { id: 'ethereum', title: 'Ethereum', markets: ordered(visible, ethereumOrder, (market) => isEthereumMarket(market)) },
    { id: 'l1', title: 'L1 networks', markets: ordered(visible, l1Order, (market) => l1Order.includes(market.id)) },
    { id: 'l2', title: 'L2 networks', markets: ordered(visible, l2Order, (market) => !isEthereumMarket(market) && !l1Order.includes(market.id)) },
  ]
  return sections.filter((section) => section.markets.length > 0)
}

function ordered(markets: Market[], ids: string[], include: (market: Market) => boolean): Market[] {
  const grouped = markets.filter(include)
  const byId = new Map(grouped.map((market) => [market.id, market]))
  const listed = ids.flatMap((id) => {
    const market = byId.get(id)
    return market ? [market] : []
  })
  const extra = grouped.filter((market) => !ids.includes(market.id))
  return [...listed, ...extra]
}

function isEthereumMarket(market: Market): boolean {
  return market.name === 'Ethereum' || market.name.startsWith('Ethereum ') || ethereumOrder.includes(market.id)
}

function menuLabel(name: string): string {
  return name.startsWith('Ethereum ') ? name.slice('Ethereum '.length) : name
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="4.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.6 10.6 15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3.5 5.25 7 8.75l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
