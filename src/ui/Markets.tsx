import { Badge, Table, Text, Tooltip } from '@mantine/core'
import { useMemo, useState } from 'react'
import { formatAmount, formatRate, formatUsd } from '../domain/numbers.ts'
import type { AssetState, Position } from '../domain/types.ts'
import { tokenIconUrl } from './icons.ts'
import styles from './Markets.module.css'
import { Mark } from './Mark.tsx'
import motion from './motion.module.css'
import { compareByMarketSize, rateExplanation } from './scenario.ts'

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
  const marketId = position?.marketId ?? ''
  const [trackedMarket, setTrackedMarket] = useState(marketId)
  if (marketId !== trackedMarket) {
    setTrackedMarket(marketId)
    setFrozenOpen(false)
  }

  const assets = useMemo(
    () => [...(position?.assets ?? [])].sort(compareByMarketSize),
    [position],
  )
  const available = assets.filter((asset) => !asset.frozen)
  const frozen = assets.filter((asset) => asset.frozen)

  if (!position) {
    return (
      <Text c="dimmed" size="sm">
        Market data will appear here once this market loads.
      </Text>
    )
  }

  return (
    <div className={`${styles.frame} ${motion.enter}`}>
      <Table className={styles.table} horizontalSpacing="md" verticalSpacing="sm" highlightOnHover aria-label="Market assets">
        <Table.Thead>
          <Table.Tr>
            <Table.Th className={styles.head}>Asset</Table.Th>
            <Table.Th className={`${styles.head} ${styles.numeric}`}>Total supplied</Table.Th>
            <Table.Th className={`${styles.head} ${styles.numeric}`}>Supply APY</Table.Th>
            <Table.Th className={`${styles.head} ${styles.numeric}`}>
              <Tooltip
                label={rateExplanation('ltv', 'supply')}
                multiline
                maw={260}
                withArrow
                position="top"
              >
                <span className={styles.hint}>LTV</span>
              </Tooltip>
            </Table.Th>
            <Table.Th className={`${styles.head} ${styles.numeric}`}>Total borrowed</Table.Th>
            <Table.Th className={`${styles.head} ${styles.numeric}`}>Borrow APY</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {available.map((asset) => (
            <MarketRow key={asset.assetId} asset={asset} protocolId={protocolId} chainId={chainId} />
          ))}
          {frozen.length > 0 ? (
            <Table.Tr className={styles.disclosureRow}>
              <Table.Td colSpan={6}>
                <button
                  type="button"
                  className={styles.disclosure}
                  aria-expanded={frozenOpen}
                  onClick={() => setFrozenOpen((open) => !open)}
                >
                  <span className={styles.disclosureCopy}>
                    <span>Frozen</span>
                    {frozenOpen ? null : (
                      <span className={styles.disclosureHint}>Click to view frozen assets</span>
                    )}
                  </span>
                  <span className={styles.count}>{frozen.length}</span>
                </button>
              </Table.Td>
            </Table.Tr>
          ) : null}
          {frozenOpen
            ? frozen.map((asset) => (
                <MarketRow key={asset.assetId} asset={asset} protocolId={protocolId} chainId={chainId} />
              ))
            : null}
        </Table.Tbody>
      </Table>
    </div>
  )
}

function MarketRow({
  asset,
  protocolId,
  chainId,
}: {
  asset: AssetState
  protocolId: string
  chainId: number | null
}) {
  return (
    <Table.Tr>
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
          <Text fw={700}>{asset.symbol}</Text>
          {asset.frozen ? (
            <Badge size="xs" variant="light" color="orange">
              Frozen
            </Badge>
          ) : null}
        </div>
      </Table.Td>
      <Table.Td className={styles.numeric}>
        <Total amount={asset.totalSupplied} usd={asset.marketSizeUsd} symbol={asset.symbol} />
      </Table.Td>
      <Table.Td className={styles.numeric}>{asset.supplyApy === null ? '—' : formatRate(asset.supplyApy)}</Table.Td>
      <Table.Td className={styles.numeric}>{asset.ltv === null ? '—' : formatRate(asset.ltv)}</Table.Td>
      <Table.Td className={styles.numeric}>
        <Total amount={asset.totalBorrowed} usd={asset.totalBorrowedUsd} symbol={asset.symbol} />
      </Table.Td>
      <Table.Td className={styles.numeric}>{asset.borrowApy === null ? '—' : formatRate(asset.borrowApy)}</Table.Td>
    </Table.Tr>
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
  return (
    <div className={styles.stack}>
      <Text>{amount === null ? '—' : `${formatAmount(amount)} ${symbol}`}</Text>
      <Text size="sm" c="dimmed">
        {usd === null ? '—' : `$${formatUsd(usd)}`}
      </Text>
    </div>
  )
}
