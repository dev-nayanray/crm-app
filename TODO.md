# TODO — ERC20 Etherscan V1→V2 API Fix

## Steps

- [x] Analyze root cause: `checkERC20Transaction` uses deprecated V1 API (`ETHERSCAN_API`) instead of V2 (`ETHERSCAN_V2_API`)
- [x] Update Receipt URL to use V2 API with `chainid=1`
- [x] Update Transaction URL to use V2 API with `chainid=1`
- [x] Update Status URL to use V2 API with `chainid=1`
- [x] Fix BigInt divisor precision (`BigInt(Math.pow(10, decimals))` → `10n ** BigInt(decimals)`)
- [ ] Restart backend server to apply changes
