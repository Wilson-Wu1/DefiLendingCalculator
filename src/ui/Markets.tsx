import { Table, Text } from '@mantine/core'
import { useMemo } from 'react'
import { formatCompactNumber, formatRate } from '../domain/numbers.ts'
import type { Position } from '../domain/types.ts'
import { tokenIconUrl } from './icons.ts'
import styles from './Markets.module.css'
import { Mark } from './Mark.tsx'
import motion from './motion.module.css'
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
  const assets = useMemo(
    () => [...(position?.assets ?? [])].sort(compareByMarketSize),
    [position],
  )

  if (!position) {
    return (
      <Text c="dimmed" size="sm">
        Market data will appear here once this market loads.
      </Text>
    )
  }

  return (
    <div className={`${styles.frame} cardFace ${motion.enter}`}>
        <Table className={styles.table} horizontalSpacing="md" verticalSpacing="sm" highlightOnHover aria-label="Market assets">
          <Table.Thead>
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
                    <Text fw={700}>{asset.symbol}</Text>
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
    </div>
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
      <Text>{amount === null ? '—' : `${formatCompactNumber(amount, 2)} ${symbol}`}</Text>
      <Text size="sm" c="dimmed">
        {usd === null ? '—' : `$${formatCompactNumber(usd, 2)}`}
      </Text>
    </div>
  )
}
