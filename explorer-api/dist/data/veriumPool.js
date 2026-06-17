/** Vericonomy-operated Verium pool (coinbase tag /VRMPOOL/ or payout address). */
export const VERIUM_POOL_DISPLAY_NAME = 'Verium Pool';
export const VERIUM_POOL_PAYOUT_ADDRESS = 'VRq98Nm2P6anLHPgnHdb6NnibJ6GoG3Jm9';
const VERIUM_ADDRESS_RE = /^V[1-9A-HJ-NP-Za-km-z]{25,34}$/;
function isVeriumAddress(value) {
    return VERIUM_ADDRESS_RE.test(value.trim());
}
/** Legacy wallet `miner.address` must be a chain address, not a display label. */
export function resolveWalletMinerAddress(extractedBy, extractedByAddress) {
    const address = typeof extractedByAddress === 'string' ? extractedByAddress.trim() : '';
    if (address)
        return address;
    const label = typeof extractedBy === 'string' ? extractedBy.trim() : '';
    if (!label)
        return null;
    if (label === VERIUM_POOL_DISPLAY_NAME)
        return VERIUM_POOL_PAYOUT_ADDRESS;
    if (isVeriumAddress(label))
        return label;
    return null;
}
