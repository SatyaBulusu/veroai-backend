# VeroAI Guardrails (Prototype)

## Principles
- Human-in-the-loop for any medium/high risk action
- All actions are auditable
- Default deny for high blast-radius actions unless explicitly allowed
- Actions must be explainable via facts

## Risk Levels
- low: safe, reversible, small blast radius
- medium: requires approval
- high: requires approval + tighter caps

## Example Hard Limits (Prototype)
- reallocate_budget: shift_percent <= 20

## Approval Policy (Prototype)
- medium/high => status 'needs_approval'
