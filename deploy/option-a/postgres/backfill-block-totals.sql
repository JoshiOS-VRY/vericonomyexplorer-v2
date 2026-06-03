-- One-time backfill of blocks.fee_sats / blocks.total_output_sats on Postgres.
--
-- The JS schema-v7 backfill (app/indexerV2/schema.js runSchemaV7Backfills) is
-- synchronous/better-sqlite3 only and never ran against Postgres, so ~99.8% of
-- migrated blocks have NULL totals. That NULL is what trips the web block page
-- (totals.outputValueAtomic expected string, received null).
--
-- Set-based equivalent of blockTotals.computeBlockTotalsRaw, chunked by height
-- with a COMMIT per chunk (a plain DO block would be ONE giant transaction).
--   total_output_sats = SUM(value_sats) over every vout in the block
--   fee_sats          = SUM(GREATEST(resolved_inputs - outputs, 0)) over the
--                       block's non-coinbase txs, but only when the block has
--                       <= cap non-coinbase txs (else NULL); blocks with no
--                       non-coinbase txs get fee_sats = 0.
--
-- Apply with (autocommit; do NOT use psql -1):
--   psql "$VCEXP_PG_URL" -v ON_ERROR_STOP=1 -f backfill-block-totals.sql

CREATE OR REPLACE PROCEDURE backfill_block_totals(
    p_chain text,
    p_step  bigint DEFAULT 50000,
    p_cap   int    DEFAULT 100
)
LANGUAGE plpgsql AS $$
DECLARE
    v_lo  bigint;
    v_hi  bigint;
    v_max bigint;
BEGIN
    SELECT COALESCE(MAX(height), -1) INTO v_max FROM blocks WHERE chain_id = p_chain;
    IF v_max < 0 THEN
        RAISE NOTICE 'chain %: no blocks, skipping', p_chain;
        RETURN;
    END IF;

    v_lo := 0;
    WHILE v_lo <= v_max LOOP
        v_hi := v_lo + p_step - 1;

        -- total_output_sats: sum of every vout value in the block
        WITH out_tot AS (
            SELECT t.block_height AS height, SUM(v.value_sats) AS total
            FROM transactions t
            JOIN vouts v ON v.chain_id = t.chain_id AND v.txid = t.txid
            WHERE t.chain_id = p_chain
                AND t.block_height BETWEEN v_lo AND v_hi
            GROUP BY t.block_height
        )
        UPDATE blocks b
        SET total_output_sats = COALESCE(o.total, 0)
        FROM out_tot o
        WHERE b.chain_id = p_chain AND b.height = o.height;

        -- fee_sats: per non-coinbase tx (resolved inputs - outputs), capped
        WITH nc AS (
            SELECT txid, block_height
            FROM transactions
            WHERE chain_id = p_chain
                AND block_height BETWEEN v_lo AND v_hi
                AND is_coinbase = 0
        ),
        blk_nc AS (
            SELECT block_height, COUNT(*) AS nc_count
            FROM nc
            GROUP BY block_height
        ),
        vin_tot AS (
            SELECT vi.txid, SUM(vi.value_sats) AS in_sats
            FROM vins vi
            JOIN transactions t ON t.chain_id = vi.chain_id AND t.txid = vi.txid
            WHERE vi.chain_id = p_chain
                AND vi.resolved = 1
                AND t.block_height BETWEEN v_lo AND v_hi
                AND t.is_coinbase = 0
            GROUP BY vi.txid
        ),
        vout_tot AS (
            SELECT vo.txid, SUM(vo.value_sats) AS out_sats
            FROM vouts vo
            JOIN transactions t ON t.chain_id = vo.chain_id AND t.txid = vo.txid
            WHERE vo.chain_id = p_chain
                AND t.block_height BETWEEN v_lo AND v_hi
                AND t.is_coinbase = 0
            GROUP BY vo.txid
        ),
        tx_fee AS (
            SELECT nc.block_height,
                   GREATEST(COALESCE(vin_tot.in_sats, 0) - COALESCE(vout_tot.out_sats, 0), 0) AS fee
            FROM nc
            LEFT JOIN vin_tot ON vin_tot.txid = nc.txid
            LEFT JOIN vout_tot ON vout_tot.txid = nc.txid
        ),
        blk_fee AS (
            SELECT block_height, SUM(fee) AS fee
            FROM tx_fee
            GROUP BY block_height
        )
        UPDATE blocks b
        SET fee_sats = CASE WHEN bn.nc_count <= p_cap THEN COALESCE(bf.fee, 0) ELSE NULL END
        FROM blk_nc bn
        LEFT JOIN blk_fee bf ON bf.block_height = bn.block_height
        WHERE b.chain_id = p_chain AND b.height = bn.block_height;

        -- blocks with no non-coinbase txs (coinbase/coinstake only) -> fee 0
        UPDATE blocks b
        SET fee_sats = 0
        WHERE b.chain_id = p_chain
            AND b.height BETWEEN v_lo AND v_hi
            AND b.fee_sats IS NULL
            AND NOT EXISTS (
                SELECT 1 FROM transactions t
                WHERE t.chain_id = p_chain
                    AND t.block_height = b.height
                    AND t.is_coinbase = 0
            );

        COMMIT;
        RAISE NOTICE 'chain % heights %..% committed', p_chain, v_lo, LEAST(v_hi, v_max);
        v_lo := v_lo + p_step;
    END LOOP;
END$$;

CALL backfill_block_totals('vrm');
CALL backfill_block_totals('vrc');

ANALYZE blocks;
