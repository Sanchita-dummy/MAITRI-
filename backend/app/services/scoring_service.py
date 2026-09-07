"""
Deterministic scoring calculations (rule 16): KPI achievement percentages
and the numeric basis for scale recommendations are computed in Python.
The LLM (Groq) is only used afterward to phrase a concise explanation.
"""
from typing import List
from app.models import KPI


def calculate_achievement_percentage(baseline: float, target: float, actual: float) -> float:
    if target == baseline:
        return 0.0
    pct = (actual - baseline) / (target - baseline) * 100
    return round(max(0.0, pct), 1)


def kpi_status_from_achievement(pct: float) -> str:
    if pct >= 100:
        return "MET"
    if pct >= 60:
        return "ON_TRACK"
    return "AT_RISK"


def average_achievement(kpis: List[KPI]) -> float:
    if not kpis:
        return 0.0
    return round(sum(k.achievement_percentage for k in kpis) / len(kpis), 1)


def deterministic_scale_decision(avg_achievement: float) -> str:
    """
    Per policy (Scale Recommendation Criteria in the knowledge base):
      >80%  -> SCALE
      50-80 -> ITERATE
      <50%  -> STOP
    """
    if avg_achievement >= 80:
        return "SCALE"
    if avg_achievement >= 50:
        return "ITERATE"
    return "STOP"
