# Health Calculator

Example Hyperliquid wallets for checking portfolio-margin lending. Positions were read from the Hyperliquid info API on 30 Sep 2026 and can change.

## Portfolio margin, supply only

`0xe867fbdad3291530e41530301ecb77693850c78e`

Account mode is `portfolioMargin`. Healthy, with no borrow, so `healthFactor` is null.

| Token | Supply | Borrow |
| --- | ---: | ---: |
| USDC | 6,487,309.1424067402 | 0 |
| HYPE | 199,999.99997989 | 0 |

## Portfolio margin, lending and borrowing

`0xf02d16a272a842f8bac1d9a9e773aba1933454c6`

Account mode is `portfolioMargin`. Status was `atRisk`, with health factor `0.9973589343`. Use this wallet when you need a real health factor.

| Token | Supply | Borrow |
| --- | ---: | ---: |
| HYPE | 642,500.14291939 | 0 |
| USDC | 0 | 37,551,571.485092029 |
