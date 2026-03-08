import { db } from "../../db/mysql.js";
import { ulid } from "../../utils/id.js";

export async function createBudget(orgId, input) {
  const id = input.id || ulid("bud");
  const { name, currency = "USD", total_amount = 0, start_date, end_date } = input;

  await db.query(
    `INSERT INTO budgets (id, org_id, name, currency, total_amount, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, orgId, name, currency, Number(total_amount), start_date, end_date]
  );
  return getBudget(orgId, id);
}

export async function listBudgets(orgId, { limit = 50, offset = 0 } = {}) {
  const [rows] = await db.query(
    `SELECT * FROM budgets
     WHERE org_id = ?
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`,
    [orgId, Number(limit), Number(offset)]
  );

  const [[cnt]] = await db.query(
    `SELECT COUNT(*) AS total FROM budgets WHERE org_id = ?`,
    [orgId]
  );

  return { total: Number(cnt.total), limit: Number(limit), offset: Number(offset), items: rows };
}

export async function getBudget(orgId, budgetId) {
  const [rows] = await db.query(
    `SELECT * FROM budgets WHERE org_id = ? AND id = ? LIMIT 1`,
    [orgId, budgetId]
  );
  return rows[0] || null;
}

export async function upsertAllocation(orgId, budgetId, input) {
  const id = input.id || ulid("bal");
  const { scope_type, scope_id, allocated_amount = 0, currency = "USD", notes = null } = input;

  await db.query(
    `INSERT INTO budget_allocations
      (id, org_id, budget_id, scope_type, scope_id, allocated_amount, currency, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       allocated_amount = VALUES(allocated_amount),
       currency = VALUES(currency),
       notes = VALUES(notes),
       updated_at = CURRENT_TIMESTAMP`,
    [id, orgId, budgetId, scope_type, scope_id, Number(allocated_amount), currency, notes]
  );

  const [rows] = await db.query(
    `SELECT * FROM budget_allocations
     WHERE org_id = ? AND budget_id = ? AND scope_type = ? AND scope_id = ?
     LIMIT 1`,
    [orgId, budgetId, scope_type, scope_id]
  );
  return rows[0] || null;
}

export async function listAllocations(orgId, budgetId) {
  const [rows] = await db.query(
    `SELECT * FROM budget_allocations
     WHERE org_id = ? AND budget_id = ?
     ORDER BY scope_type ASC, scope_id ASC`,
    [orgId, budgetId]
  );
  return rows;
}
