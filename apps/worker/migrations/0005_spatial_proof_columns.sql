-- Migration: 0005_spatial_proof_columns.sql
-- Subsystem: apps/worker/ (Cloudflare D1 Relational Mirror)
-- Epistemic Boundary: Enforces Four-Part Spatial Proof Quadruple on event_log

ALTER TABLE event_log ADD COLUMN topology_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE event_log ADD COLUMN overlay_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE event_log ADD COLUMN query_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE event_log ADD COLUMN receipt_hash TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_event_log_receipt_hash ON event_log(receipt_hash);

-- Re-arm append-only immutability sentinels
CREATE TRIGGER IF NOT EXISTS trg_event_log_no_update
BEFORE UPDATE ON event_log
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, '[IMMUTABILITY_VIOLATION] event_log is append-only. UPDATE operations are strictly prohibited.');
END;

CREATE TRIGGER IF NOT EXISTS trg_event_log_no_delete
BEFORE DELETE ON event_log
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, '[IMMUTABILITY_VIOLATION] event_log is append-only. DELETE operations are strictly prohibited.');
END;

