import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { bn, formatRate, formatUsd } from '../domain/numbers.ts'
import type { AssetState, Edits, Position } from '../domain/types.ts'
import styles from './Board.module.css'
import caption from './caption.module.css'
import motion from './motion.module.css'
import { commaBreaks } from './commaBreaks.tsx'
import { Presence } from './Presence.tsx'
import { tokenIconUrl } from './icons.ts'
import { Mark } from './Mark.tsx'
import { compareByMarketSize, scenarioRows, type ScenarioRow } from './scenario.ts'

type Side = 'supply' | 'borrow'
type AmountKey = 'suppliedByAsset' | 'borrowedByAsset'

type BoardProps = {
  position: Position | null
  protocolId: string
  chainId: number | null
  edits: Edits
  onAmount: (side: AmountKey, assetId: string, value: string) => void
  onPrice: (assetId: string, value: string) => void
  onThreshold: (assetId: string, fraction: string) => void
}

export function Board({ position, protocolId, chainId, edits, onAmount, onPrice, onThreshold }: BoardProps) {
  const narrow = useMediaQuery('(max-width: 999px)', false, { getInitialValueInEffect: false })
  const [side, setSide] = useState<Side>('supply')
  const rows = useMemo(
    () => (position ? scenarioRows(position, edits) : []),
    [position, edits],
  )
  const assets = position?.assets ?? []

  return (
    <Stack gap="md">
      {narrow ? (
        <SegmentedControl
          fullWidth
          value={side}
          onChange={(value) => setSide(value as Side)}
          data={[
            { label: 'Supply', value: 'supply' },
            { label: 'Borrow', value: 'borrow' },
          ]}
        />
      ) : null}
      <SimpleGrid cols={narrow ? 1 : 2} spacing="md">
        {(!narrow || side === 'supply') && (
          <Column
            enterDelay="160ms"
            title="Supply"
            side="supply"
            rows={rows}
            assets={assets}
            protocolId={protocolId}
            chainId={chainId}
            disabled={!position}
            onAmount={(assetId, value) => onAmount('suppliedByAsset', assetId, value)}
            onPrice={onPrice}
            onThreshold={onThreshold}
          />
        )}
        {(!narrow || side === 'borrow') && (
          <Column
            enterDelay="230ms"
            title="Borrow"
            side="borrow"
            rows={rows}
            assets={assets}
            protocolId={protocolId}
            chainId={chainId}
            disabled={!position}
            onAmount={(assetId, value) => onAmount('borrowedByAsset', assetId, value)}
            onPrice={onPrice}
            onThreshold={onThreshold}
          />
        )}
      </SimpleGrid>
    </Stack>
  )
}

function Column({
  enterDelay,
  title,
  side,
  rows,
  assets,
  protocolId,
  chainId,
  disabled,
  onAmount,
  onPrice,
  onThreshold,
}: {
  enterDelay: string
  title: string
  side: Side
  rows: ScenarioRow[]
  assets: AssetState[]
  protocolId: string
  chainId: number | null
  disabled: boolean
  onAmount: (assetId: string, value: string) => void
  onPrice: (assetId: string, value: string) => void
  onThreshold: (assetId: string, fraction: string) => void
}) {
  const [pinned, setPinned] = useState<Set<string>>(() => new Set())
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [frozenOpen, setFrozenOpen] = useState(false)
  const pendingFocus = useRef<string | null>(null)

  useLayoutEffect(() => {
    const assetId = pendingFocus.current
    if (!assetId) return
    const node = document.getElementById(amountDomId(side, assetId))
    if (!(node instanceof HTMLInputElement)) return
    node.focus({ preventScroll: true })
    node.select()
    pendingFocus.current = null
  })

  const q = query.trim().toLowerCase()
  const active = rows.filter((row) => {
    const amount = side === 'supply' ? row.supplied : row.borrowed
    return bn(amount).gt(0) || pinned.has(row.assetId)
  })
  const activeIds = new Set(active.map((row) => row.assetId))
  for (const assetId of leaving) activeIds.add(assetId)
  const shownActive = rows.filter((row) => activeIds.has(row.assetId)).sort(compareByMarketSize)
  const listed = assets
    .filter((asset) => {
      if (activeIds.has(asset.assetId)) return false
      if (side === 'borrow' && !asset.borrowingEnabled) return false
      if (q && !asset.symbol.toLowerCase().includes(q)) return false
      return true
    })
    .sort(compareByMarketSize)
  const available = listed.filter((asset) => !asset.frozen)
  const frozen = listed.filter((asset) => asset.frozen)
  const showFrozen = frozenOpen || q.length > 0
  const total = active.reduce(
    (sum, row) => sum.plus(side === 'supply' ? row.supplyUsd : row.borrowUsd),
    bn(0),
  )

  function pick(assetId: string) {
    pendingFocus.current = assetId
    setLeaving((current) => {
      if (!current.has(assetId)) return current
      const next = new Set(current)
      next.delete(assetId)
      return next
    })
    setPinned((current) => {
      const next = new Set(current)
      next.add(assetId)
      return next
    })
  }

  function remove(assetId: string) {
    onAmount(assetId, '0')
    setPinned((current) => {
      if (!current.has(assetId)) return current
      const next = new Set(current)
      next.delete(assetId)
      return next
    })
    setLeaving((current) => {
      const next = new Set(current)
      next.add(assetId)
      return next
    })
  }

  function finishLeave(assetId: string) {
    setLeaving((current) => {
      if (!current.has(assetId)) return current
      const next = new Set(current)
      next.delete(assetId)
      return next
    })
  }

  return (
    <Stack
      component="section"
      gap={0}
      className={`${styles.column} ${motion.enter}`}
      style={{ animationDelay: enterDelay }}
    >
      <div className={styles.columnHead}>
        <h2 className={`${caption.caption} ${styles.columnTitle}`}>{title}</h2>
        <Text size="sm" c="dimmed" className={styles.columnTotal}>
          Total ${commaBreaks(formatUsd(total.toFixed()))}
        </Text>
      </div>
      {shownActive.map((row) => {
        const amount = side === 'supply' ? row.supplied : row.borrowed
        const live = (bn(amount).gt(0) || pinned.has(row.assetId)) && !leaving.has(row.assetId)
        return (
          <Presence
            key={row.assetId}
            present={live}
            space="20px"
            onExited={() => finishLeave(row.assetId)}
          >
            <Paper withBorder radius="md" p="md" className={`${styles.cardPaper} cardFace cardFaceQuiet`}>
              <AssetRow
                row={row}
                side={side}
                title={title}
                protocolId={protocolId}
                chainId={chainId}
                onAmount={onAmount}
                onPrice={onPrice}
                onThreshold={onThreshold}
                onRemove={() => remove(row.assetId)}
              />
            </Paper>
          </Presence>
        )
      })}
      <TextInput
        placeholder="Filter assets"
        aria-label={`Filter ${title.toLowerCase()} assets`}
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.currentTarget.value)}
        mb="sm"
        styles={{ input: { backgroundColor: 'var(--hc-segment)', borderColor: 'transparent' } }}
      />
      {available.length > 0 ? (
        <Stack gap={8}>
          {available.map((asset) => (
            <AvailableAsset
              key={asset.assetId}
              asset={asset}
              side={side}
              protocolId={protocolId}
              chainId={chainId}
              disabled={disabled}
              onPick={pick}
            />
          ))}
        </Stack>
      ) : null}
      {frozen.length > 0 ? (
        <Stack gap={8} mt={available.length > 0 ? 'sm' : 0}>
          <button
            type="button"
            className={styles.disclosure}
            aria-expanded={showFrozen}
            onClick={() => setFrozenOpen((open) => !open)}
          >
            <span className={styles.disclosureCopy}>
              <span>Frozen</span>
              {showFrozen ? null : (
                <span className={styles.hint}>Click to view frozen assets</span>
              )}
            </span>
            <span className={styles.action}>{frozen.length}</span>
          </button>
          <Presence present={showFrozen} space="8px" spaceAt="before" conceal>
            <Stack gap={8}>
              {frozen.map((asset) => (
                <AvailableAsset
                  key={asset.assetId}
                  asset={asset}
                  side={side}
                  protocolId={protocolId}
                  chainId={chainId}
                  disabled={disabled}
                  onPick={pick}
                />
              ))}
            </Stack>
          </Presence>
        </Stack>
      ) : null}
      {available.length === 0 && frozen.length === 0 && !disabled && (q || shownActive.length === 0) ? (
        <Text c="dimmed" size="sm">
          No matching assets
        </Text>
      ) : null}
    </Stack>
  )
}

function AvailableAsset({
  asset,
  side,
  protocolId,
  chainId,
  disabled,
  onPick,
}: {
  asset: AssetState
  side: Side
  protocolId: string
  chainId: number | null
  disabled: boolean
  onPick: (assetId: string) => void
}) {
  const action = side === 'supply' ? 'Supply' : 'Borrow'
  const blocked = disabled || asset.frozen

  return (
    <button
      type="button"
      className={styles.available}
      aria-disabled={blocked || undefined}
      aria-label={`${action} ${asset.symbol}`}
      onClick={() => {
        if (blocked) return
        onPick(asset.assetId)
      }}
    >
      <span className={styles.identity}>
        <Mark
          src={tokenIconUrl({
            protocolId,
            chainId,
            assetId: asset.assetId,
            symbol: asset.symbol,
          })}
          label={asset.symbol}
          size={18}
        />
        <span className={styles.symbol}>{asset.symbol}</span>
        {side === 'supply' ? (
          <CollateralBadge collateral={asset.usageAsCollateral} className={styles.listBadge} />
        ) : null}
        {asset.frozen ? (
          <Badge className={styles.listBadge} size="xs" variant="light" color="orange">
            Frozen
          </Badge>
        ) : null}
      </span>
      <span className={`${styles.action} ${styles.pick}`}>{action}</span>
    </button>
  )
}

function AssetRow({
  row,
  side,
  title,
  protocolId,
  chainId,
  onAmount,
  onPrice,
  onThreshold,
  onRemove,
}: {
  row: ScenarioRow
  side: Side
  title: string
  protocolId: string
  chainId: number | null
  onAmount: (assetId: string, value: string) => void
  onPrice: (assetId: string, value: string) => void
  onThreshold: (assetId: string, fraction: string) => void
  onRemove: () => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const amount = side === 'supply' ? row.supplied : row.borrowed
  const usd = side === 'supply' ? row.supplyUsd : row.borrowUsd
  const apy = side === 'supply' ? row.supplyApy : row.borrowApy
  const protocol = Number(row.protocolPriceUsd)
  const current = Number(row.priceUsd)
  const ceiling = Math.max((Number.isFinite(protocol) ? protocol : 0) * 3, current, 1)
  const change = protocol > 0 ? (current / protocol - 1) * 100 : 0
  const nudgeBase = Number.isFinite(current) && current > 0 ? row.priceUsd : row.protocolPriceUsd
  const canNudge = bn(nudgeBase).gt(0)

  function applyPrice(value: string) {
    setDraft(null)
    onPrice(row.assetId, value)
  }

  function nudgePrice(factor: number) {
    const next = bn(nudgeBase).multipliedBy(factor)
    if (!next.isFinite() || next.lte(0)) return
    applyPrice(next.toFixed())
  }

  function onPriceInput(value: string) {
    setDraft(value)
    const trimmed = value.trim()
    if (trimmed === '') {
      onPrice(row.assetId, '0')
      return
    }
    if (!/^\d*\.?\d*$/.test(trimmed)) return
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) onPrice(row.assetId, String(parsed))
  }

  const showNotCollateral = side === 'supply' && !row.usageAsCollateral
  const badges =
    showNotCollateral || row.frozen ? (
      <>
        {showNotCollateral ? <CollateralBadge collateral={false} /> : null}
        {row.frozen ? (
          <Badge size="xs" variant="light" color="orange">
            Frozen
          </Badge>
        ) : null}
      </>
    ) : null

  return (
    <Box className={styles.card}>
      <ActionIcon
        className={styles.remove}
        variant="subtle"
        color="gray"
        aria-label={`Remove ${row.symbol}`}
        onClick={onRemove}
      >
        ×
      </ActionIcon>
      <div className={styles.cardHead}>
        <div className={styles.cardIdentity}>
          <span className={styles.cardMark}>
            <Mark
              src={tokenIconUrl({ protocolId, chainId, assetId: row.assetId, symbol: row.symbol })}
              label={row.symbol}
              size={28}
            />
          </span>
          <div className={styles.cardMeta}>
            <Text fw={700} className={styles.cardSymbol}>
              {row.symbol}
            </Text>
            {apy !== null ? (
              <Text size="sm" c="dimmed" className={styles.cardApy}>
                {formatRate(apy)} APY
              </Text>
            ) : null}
            {badges ? <div className={styles.cardBadges}>{badges}</div> : null}
          </div>
        </div>
        <div className={styles.cardTools}>
          <div className={styles.cardValue}>
            <Text size="sm" c="dimmed" className={styles.fieldLabel}>
              Total value
            </Text>
            <Text className={styles.usd}>${commaBreaks(formatUsd(usd))}</Text>
          </div>
        </div>
      </div>
      <div className={styles.fields}>
        <div className={styles.amountField}>
          <Text
            component="label"
            htmlFor={amountDomId(side, row.assetId)}
            size="sm"
            c="dimmed"
            className={styles.fieldLabel}
          >
            Amount
          </Text>
          <TextInput
            id={amountDomId(side, row.assetId)}
            aria-label={`${row.symbol} ${title.toLowerCase()} amount`}
            inputMode="decimal"
            value={amount}
            onFocus={(event) => {
              if (event.currentTarget.value === '0') event.currentTarget.select()
            }}
            onMouseDown={(event) => {
              if (event.currentTarget.value !== '0') return
              event.preventDefault()
              event.currentTarget.focus()
              event.currentTarget.select()
            }}
            onChange={(event) => onAmount(row.assetId, nextAmount(amount, event.currentTarget.value))}
          />
        </div>
        <div className={styles.priceBlock}>
          <div className={styles.amountField}>
              <div className={styles.priceTitle}>
                <Text size="sm" c="dimmed" className={styles.fieldLabel}>
                  Price
                </Text>
                <Text size="sm" c={change >= 0 ? 'var(--hc-safe)' : 'var(--hc-danger)'} className={styles.priceChange}>
                  {change >= 0 ? '+' : ''}
                  {change.toFixed(2)}%
                </Text>
              </div>
              <TextInput
                className={styles.priceField}
                aria-label={`${row.symbol} price in dollars`}
                inputMode="decimal"
                value={draft ?? priceInputValue(row.priceUsd)}
                onChange={(event) => onPriceInput(event.currentTarget.value)}
                onBlur={() => setDraft(null)}
                leftSection={
                  <Text size="sm" c="dimmed">
                    $
                  </Text>
                }
                leftSectionWidth={22}
              />
            </div>
            <div className={styles.priceActions}>
                <Button
                  size="compact-xs"
                  variant="default"
                  disabled={!canNudge}
                  aria-label={`Decrease ${row.symbol} price by 5%`}
                  onClick={() => nudgePrice(0.95)}
                >
                  −5%
                </Button>
                <Button
                  size="compact-xs"
                  variant="default"
                  disabled={!canNudge}
                  aria-label={`Increase ${row.symbol} price by 5%`}
                  onClick={() => nudgePrice(1.05)}
                >
                  +5%
                </Button>
                <Button
                  size="compact-xs"
                  variant="default"
                  disabled={bn(row.priceUsd).eq(bn(row.protocolPriceUsd))}
                  aria-label={`Reset ${row.symbol} price to the current price`}
                  onClick={() => applyPrice(row.protocolPriceUsd)}
                >
                  Reset
                </Button>
            </div>
          <Slider
            min={0}
            max={ceiling}
            step={ceiling > 100 ? 0.01 : ceiling / 200}
            value={Number.isFinite(current) ? Math.min(Math.max(current, 0), ceiling) : 0}
            onChange={(value) => applyPrice(String(value))}
            label={null}
            showLabelOnHover={false}
            thumbLabel={`${row.symbol} price`}
            size="sm"
          />
        </div>
        {side === 'supply' && row.showThreshold && row.liquidationThreshold !== null ? (
          <div className={styles.priceBlock}>
            <div className={styles.lineHead}>
              <Text size="sm" c="dimmed" className={styles.thresholdLabel}>
                Liquidation threshold {(row.liquidationThreshold * 100).toFixed(2)}%
              </Text>
              <Button
                size="compact-xs"
                variant="default"
                disabled={
                  row.protocolLiquidationThreshold === null ||
                  (row.liquidationThreshold * 100).toFixed(2) ===
                    (row.protocolLiquidationThreshold * 100).toFixed(2)
                }
                aria-label={`Reset ${row.symbol} liquidation threshold to the current threshold`}
                onClick={() => {
                  if (row.protocolLiquidationThreshold === null) return
                  onThreshold(row.assetId, String(row.protocolLiquidationThreshold))
                }}
              >
                Reset
              </Button>
            </div>
            <Slider
              min={0}
              max={100}
              step={0.1}
              value={row.liquidationThreshold * 100}
              onChange={(value) => onThreshold(row.assetId, String(value / 100))}
              label={null}
              showLabelOnHover={false}
              thumbLabel={`${row.symbol} liquidation threshold`}
              size="sm"
            />
          </div>
        ) : null}
      </div>
    </Box>
  )
}

/** Drop the placeholder 0 once the user types a real amount onto it. */
function nextAmount(current: string, next: string): string {
  if (current !== '0') return next
  if (next === '.' || next === '.0') return '0.'
  if (next.startsWith('0.')) return next
  if (/^0\d/.test(next)) return next.replace(/^0+(?=\d)/, '')
  if (/^\d+0$/.test(next)) return next.slice(0, -1)
  return next
}

function priceInputValue(price: string): string {
  const parsed = Number(price)
  if (!Number.isFinite(parsed)) return ''
  return parsed.toFixed(8).replace(/\.?0+$/, '')
}

function CollateralBadge({ collateral, className }: { collateral: boolean; className?: string }) {
  if (collateral) return null
  return (
    <Tooltip
      label="This supply does not count as collateral. It does not increase how much you can borrow, and it is left out of the health factor."
      multiline
      maw={280}
      withArrow
      position="top"
    >
      <Badge className={`${styles.hintBadge} ${className ?? ''}`} component="span" size="xs" variant="light" color="gray">
        Not collateral
      </Badge>
    </Tooltip>
  )
}

function amountDomId(side: Side, assetId: string): string {
  return `amount-${side}-${assetId}`
}
