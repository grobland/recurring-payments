-- Backfill statementDate for existing statements from their earliest transaction date.
-- Without this, the coverage grid shows all cells as gray because the coverage API
-- filters on statementDate (skipping NULLs).

UPDATE statements s
SET statement_date = sub.earliest
FROM (
  SELECT statement_id, MIN(transaction_date) AS earliest
  FROM transactions
  GROUP BY statement_id
) sub
WHERE s.id = sub.statement_id
  AND s.statement_date IS NULL;
