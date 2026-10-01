import { Alert, Badge, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'
import { bn, formatCompactNumber, formatRate, formatUsd } from '../domain/numbers.ts'
import type { Edits, Position, Result } from '../domain/types.ts'
import { commaBreaks } from './commaBreaks.tsx'
import motion from './motion.module.css'
import { Presence } from './Presence.tsx'
import { isLiquidated, thirdMetric } from './riskMetric.ts'
import { netYield, scenarioRows } from './scenario.ts'

type MetricsProps = {
  position: Position | null
  result: Result | null
  edits: Edits
}

const healthColors = {
  'hf-safe': 'var(--hc-safe)',
  'hf-warn': 'var(--hc-warn)',
  'hf-danger': 'var(--hc-danger)',
}

export function Metrics({ position, result, edits }: MetricsProps) {
  const health = result?.healthFactor ?? null
  const unit = result?.healthUnit ?? position?.healthUnit ?? 'ratio'
  const portfolioMargin =
    position?.snapshot.kind === 'hyperliquid' && position.snapshot.accountMode === 'portfolioMargin'
  const third = thirdMetric(result, unit, portfolioMargin)
  const rows = position ? scenarioRows(position, edits) : []
  const yieldResult = netYield(rows, result?.netWorthUsd ?? '0')
  const yearly = yieldResult.yearlyUsd === null ? null : bn(yieldResult.yearlyUsd)
  const currentPrice =
    rows.find((row) => row.assetId === result?.liquidationPrice?.assetId)?.priceUsd ?? null
  const liquidated = isLiquidated(result, currentPrice)
  const bufferHit = liquidated && unit === 'ratio'
  const priceHit = liquidated && unit === 'percent'
  const liquidatedLabel = portfolioMargin ? 'At threshold' : 'Liquidated'

  return (
    <Stack gap={0} mb="xl">
      <Presence present={liquidated} space="var(--mantine-spacing-md)">
        <Alert color="red" variant="light" role="alert" title={liquidatedLabel}>
          {portfolioMargin
            ? 'Collateral is at the borrow threshold. Account liquidation also depends on perpetual margin, which this calculator does not include.'
            : 'This position would be liquidated at these prices.'}
        </Alert>
      </Presence>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" aria-label="Position metrics">
        <Stat
          delay="120ms"
          label="Net worth"
          value={`$${result ? formatUsd(result.netWorthUsd) : '0.00'}`}
          note="Value supplied minus value borrowed, at scenario prices."
        />
        <Stat
          delay="170ms"
          label="Health factor"
          value={formatHealth(health, unit)}
          secondary={unit === 'ratio' ? awayFromLiquidation(result) : null}
          note={healthNote(unit, portfolioMargin)}
          color={healthColor(result)}
          badge={bufferHit ? liquidatedLabel : null}
        />
        <Stat
          delay="220ms"
          label={third.label}
          value={third.value}
          note={third.note}
          badge={priceHit ? liquidatedLabel : null}
          color={priceHit ? 'var(--hc-danger)' : undefined}
        />
        <Stat
          delay="270ms"
          label="Net yield"
          value={yieldResult.apy === null ? '—' : formatRate(yieldResult.apy)}
          secondary={yearly === null ? null : <YieldPeriods yearly={yearly} />}
          note="Interest only. Does not include reward incentives."
          color={yearly === null || yearly.isZero() ? undefined : yearly.gt(0) ? 'var(--hc-safe)' : 'var(--hc-danger)'}
        />
      </SimpleGrid>
    </Stack>
  )
}

function Stat({
  delay,
  label,
  value,
  secondary,
  note,
  color,
  badge,
}: {
  delay: string
  label: string
  value: string
  secondary?: ReactNode
  note: string
  color?: string
  badge?: string | null
}) {
  return (
    <Paper
      className={`${motion.enter} cardFace`}
      p="md"
      radius="md"
      withBorder
      style={{ minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', animationDelay: delay }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
        <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
          {label}
        </Text>
        {badge ? (
          <Badge className={motion.badgeIn} color="red" variant="light" size="sm">
            {badge}
          </Badge>
        ) : null}
      </Group>
      <Text
        className={motion.tone}
        fz={32}
        fw={700}
        lh={1.2}
        mt={6}
        c={color}
        style={{
          fontVariantNumeric: 'tabular-nums',
          maxWidth: '100%',
          minWidth: 0,
          overflowWrap: 'anywhere',
          textWrap: 'balance',
          whiteSpace: 'normal',
        }}
      >
        {commaBreaks(value)}
      </Text>
      {secondary ? (
        <Text className={motion.tone} size="sm" fw={600} mt={4} c={color} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {secondary}
        </Text>
      ) : null}
      <Text size="sm" c="dimmed" mt="auto" pt={8}>
        {note}
      </Text>
    </Paper>
  )
}

export function healthClass(result: Result | null): keyof typeof healthColors {
  if (!result || result.healthFactor === null) return 'hf-safe'
  const value = Number(result.healthFactor)
  if (!Number.isFinite(value)) return 'hf-safe'
  if (result.healthUnit === 'percent') {
    const floor = result.liquidationHealthPercent ?? 100
    if (value <= floor) return 'hf-danger'
    if (value <= 100) return 'hf-warn'
    return 'hf-safe'
  }
  if (value <= 1.1) return 'hf-danger'
  if (value <= 3) return 'hf-warn'
  return 'hf-safe'
}

export function healthColor(result: Result | null): string {
  return healthColors[healthClass(result)]
}

function YieldPeriods({ yearly }: { yearly: ReturnType<typeof bn> }) {
  const periods = [
    ['Year', yearly],
    ['Month', yearly.dividedBy(12)],
    ['Day', yearly.dividedBy(365)],
  ] as const
  return (
    <span style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', columnGap: 8 }}>
      {periods.map(([label, amount]) => (
        <span key={label} style={{ minWidth: 0, lineHeight: 1.25 }}>
          <span style={{ display: 'block' }}>{commaBreaks(signedUsd(amount.toFixed()))}</span>
          <span style={{ display: 'block', fontWeight: 500, color: 'var(--mantine-color-text)' }}>{label}</span>
        </span>
      ))}
    </span>
  )
}

function signedUsd(value: string): string {
  const parsed = bn(value)
  const text = formatUsd(parsed.abs().toFixed())
  if (parsed.gt(0)) return `+$${text}`
  if (parsed.lt(0)) return `-$${text}`
  return `$${text}`
}

function formatHealth(value: string | null, unit: 'ratio' | 'percent'): string {
  if (value === null) return '∞'
  const text = formatCompactNumber(value, 2)
  return unit === 'percent' ? `${text}%` : text
}

function awayFromLiquidation(result: Result | null): string | null {
  const buffer = result?.liquidationBuffer
  if (buffer == null) return null
  return `${formatCompactNumber(String(Number(buffer) * 100), 2)}% away from liquidation`
}

function healthNote(unit: 'ratio' | 'percent', portfolioMargin: boolean): string {
  if (unit === 'percent' && portfolioMargin) {
    return 'How much room is left to borrow. At 100%, no more borrowing is allowed. Account liquidation also depends on perpetual margin, which this calculator does not include.'
  }
  if (unit === 'percent') {
    return 'How much room is left to borrow. At 100%, no more borrowing is allowed. Liquidation starts lower than this.'
  }
  return 'Collateral value times liquidation threshold, divided by debt. Liquidation is near 1.'
}
