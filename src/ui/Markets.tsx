import { Table, Text, Tooltip } from '@mantine/core'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatCompactNumber, formatRate } from '../domain/numbers.ts'
import type { AssetState, Position } from '../domain/types.ts'
import { tokenIconUrl } from './icons.ts'
import styles from './Markets.module.css'
import { Mark } from './Mark.tsx'
import motion from './motion.module.css'
import { Presence } from './Presence.tsx'
import { compareByMarketSize } from './scenario.ts'

export function Markets({
  position,
  protocolId,
  chainId,
}: {
  position: Position | null
  protocolId: string
  chainId: number | null
}) {
  const [frozenOpen, setFrozenOpen] = useState(false)
  const assets = useMemo(
    () => [...(position?.assets ?? [])].sort(compareByMarketSize),
    [position],
  )
  const available = useMemo(() => assets.filter((asset) => !asset.frozen), [assets])
  const frozen = useMemo(() => assets.filter((asset) => asset.frozen), [assets])

  useEffect(() => {
    setFrozenOpen(false)
  }, [position?.marketId])

  if (!position) {
    return (
      <Text c="dimmed" size="sm">
        Market data will appear here once this market loads.
      </Text>
    )
  }

  return (
    <div className={`${styles.frame} cardFace ${motion.enter}`}>
      <AssetTable
        assets={available}
        protocolId={protocolId}
        chainId={chainId}
        label="Market assets"
      />
      {frozen.length > 0 ? (
        <div className={styles.frozen}>
          <div className={styles.frozenBar}>
            <button
              type="button"
              className={styles.disclosure}
              aria-expanded={frozenOpen}
              onClick={() => setFrozenOpen((open) => !open)}
            >
              <span className={styles.disclosureCopy}>
                <span>Frozen</span>
                {frozenOpen ? null : <span className={styles.hint}>Click to view frozen assets</span>}
              </span>
              <span className={styles.action}>
                {frozen.length}
                <Chevron open={frozenOpen} />
              </span>
            </button>
          </div>
          <Presence present={frozenOpen} space="8px" spaceAt="before" conceal>
            <AssetTable
              assets={frozen}
              protocolId={protocolId}
              chainId={chainId}
              label="Frozen assets"
              hideHeader
            />
          </Presence>
        </div>
      ) : null}
    </div>
  )
}

function AssetTable({
  assets,
  protocolId,
  chainId,
  label,
  hideHeader = false,
}: {
  assets: AssetState[]
  protocolId: string
  chainId: number | null
  label: string
  hideHeader?: boolean
}) {
  return (
    <Table
      className={styles.table}
      layout="fixed"
      horizontalSpacing="md"
      verticalSpacing="sm"
      highlightOnHover
      aria-label={label}
    >
      <colgroup>
        <col className={styles.assetCol} />
        <col className={styles.sizeCol} />
        <col className={styles.rateCol} />
        <col className={styles.sizeCol} />
        <col className={styles.rateCol} />
      </colgroup>
      <Table.Thead className={hideHeader ? styles.hiddenHead : undefined}>
        <Table.Tr>
          <Table.Th className={styles.head}>Asset</Table.Th>
          <Table.Th className={`${styles.head} ${styles.numeric}`}>Total supplied</Table.Th>
          <Table.Th className={`${styles.head} ${styles.numeric}`}>Supply APY</Table.Th>
          <Table.Th className={`${styles.head} ${styles.numeric}`}>Total borrowed</Table.Th>
          <Table.Th className={`${styles.head} ${styles.numeric}`}>Borrow APY</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {assets.map((asset) => (
          <Table.Tr key={asset.assetId}>
            <Table.Td>
              <div className={styles.asset}>
                <Mark
                  src={tokenIconUrl({
                    protocolId,
                    chainId,
                    assetId: asset.assetId,
                    symbol: asset.symbol,
                  })}
                  label={asset.symbol}
                  size={28}
                />
                <AssetName symbol={asset.symbol} />
              </div>
            </Table.Td>
            <Table.Td className={styles.numeric}>
              <Total amount={asset.totalSupplied} usd={asset.marketSizeUsd} symbol={asset.symbol} />
            </Table.Td>
            <Table.Td className={styles.numeric}>{asset.supplyApy === null ? '—' : formatRate(asset.supplyApy)}</Table.Td>
            <Table.Td className={styles.numeric}>
              <Total amount={asset.totalBorrowed} usd={asset.totalBorrowedUsd} symbol={asset.symbol} />
            </Table.Td>
            <Table.Td className={styles.numeric}>{asset.borrowApy === null ? '—' : formatRate(asset.borrowApy)}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={open ? styles.chevronOpen : styles.chevron} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
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

function useCutOff(key: string) {
  const ref = useRef<HTMLElement>(null)
  const [cutOff, setCutOff] = useState(false)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => setCutOff(node.scrollWidth > node.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [key])

  return { ref, cutOff }
}

function AssetName({ symbol }: { symbol: string }) {
  const { ref, cutOff } = useCutOff(symbol)

  return (
    <Tooltip label={symbol} disabled={!cutOff} withArrow position="top-start" openDelay={200}>
      <Text ref={ref} component="span" fw={700} className={styles.symbol}>
        {symbol}
      </Text>
    </Tooltip>
  )
}

function Total({
  amount,
  usd,
  symbol,
}: {
  amount: string | null
  usd: string | null
  symbol: string
}) {
  const shown = amount === null ? null : formatCompactNumber(amount, 2)
  const { ref, cutOff } = useCutOff(`${shown ?? ''} ${symbol}`)

  return (
    <div className={styles.stack}>
      {shown === null ? (
        <Text>—</Text>
      ) : (
        <Text className={styles.amountLine}>
          <span>{shown}</span>
          <Tooltip label={symbol} disabled={!cutOff} withArrow position="top-end" openDelay={200}>
            <span ref={ref} className={styles.amountSymbol}>
              {symbol}
            </span>
          </Tooltip>
        </Text>
      )}
      <Text size="sm" c="dimmed">
        {usd === null ? '—' : `$${formatCompactNumber(usd, 2)}`}
      </Text>
    </div>
  )
}
