"""
Rule-based eligibility checking (deterministic Python, no LLM involved -
per rule 16, deterministic calculations must not be delegated to the LLM).
"""
from typing import List, Dict, Any
from app.models import Challenge, Startup, EligibilityRule


def _check_rule(rule: EligibilityRule, startup: Startup) -> Dict[str, Any]:
    passed = True
    detail = ""

    if rule.rule_type == "min_trl":
        required = int(rule.required_value)
        passed = (startup.trl_level or 0) >= required
        detail = f"Requires TRL >= {required}; startup TRL = {startup.trl_level}"

    elif rule.rule_type == "certification_required":
        required_cert = rule.required_value
        passed = required_cert in (startup.certifications or [])
        detail = f"Requires certification '{required_cert}'; startup has {startup.certifications or []}"

    elif rule.rule_type == "government_experience":
        required = bool(rule.required_value)
        passed = (not required) or bool(startup.government_experience)
        detail = f"Requires prior government experience: {required}; startup has: {startup.government_experience}"

    elif rule.rule_type == "min_deployment_capacity":
        order = ["Pilot only (1-2 sites)", "Regional (state-level)", "Pan-India"]
        try:
            req_idx = order.index(rule.required_value)
            stu_idx = order.index(startup.deployment_capacity)
            passed = stu_idx >= req_idx
        except ValueError:
            passed = False
        detail = f"Requires deployment capacity >= '{rule.required_value}'; startup has '{startup.deployment_capacity}'"

    elif rule.rule_type == "sector_match":
        passed = True  # sector compatibility validated separately against the challenge sector
        detail = "Sector compatibility checked against challenge sector"

    else:
        detail = f"Unknown rule type '{rule.rule_type}' - skipped"

    return {
        "rule_id": rule.rule_id,
        "label": rule.label,
        "passed": passed,
        "detail": detail,
    }


def check_eligibility(challenge: Challenge, startup: Startup, rules: List[EligibilityRule]) -> Dict[str, Any]:
    rule_results = [_check_rule(r, startup) for r in rules]

    # sector compatibility check (always applied)
    sector_ok = (challenge.sector or "").lower() in [s.lower() for s in (startup.sectors or [])]
    rule_results.append({
        "rule_id": "SECTOR_CHECK",
        "label": "Sector Compatibility",
        "passed": sector_ok,
        "detail": f"Challenge sector '{challenge.sector}' vs startup sectors {startup.sectors}",
    })

    passed_count = sum(1 for r in rule_results if r["passed"])
    total = len(rule_results)
    ratio = passed_count / total if total else 1.0

    if ratio == 1.0:
        verdict = "ELIGIBLE"
    elif ratio >= 0.6:
        verdict = "BORDERLINE"
    else:
        verdict = "NOT_ELIGIBLE"

    explanations = [
        f"{'PASS' if r['passed'] else 'FAIL'}: {r['label']} - {r['detail']}"
        for r in rule_results
    ]

    return {
        "verdict": verdict,
        "explanations": explanations,
        "rule_results": rule_results,
    }
