"""
Rule-based scoring service for submissions.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class ScoringResult:
    """Result of rule-based scoring."""
    base_score: float
    time_bonus: float
    memory_bonus: float
    penalty: float
    final_score: float
    breakdown: dict


def calculate_score(
    testcases_passed: int,
    total_testcases: int,
    question_points: int = 100,
    execution_time_ms: float = 0,
    average_time_ms: float = 100,
    memory_used_mb: float = 0,
    average_memory_mb: float = 50
) -> ScoringResult:
    """
    Calculate rule-based score for a submission.
    
    Scoring Logic:
    - Base score = (testcases_passed / total_testcases) * question_points
    - Time bonus: +5% if execution < average
    - Memory efficiency: +5% if memory < average
    - Penalty: -10% per failed testcase after 50% pass rate
    
    Args:
        testcases_passed: Number of testcases passed
        total_testcases: Total number of testcases
        question_points: Maximum points for the question
        execution_time_ms: Execution time in milliseconds
        average_time_ms: Average execution time for comparison
        memory_used_mb: Memory used in MB
        average_memory_mb: Average memory for comparison
    
    Returns:
        ScoringResult with breakdown
    """
    if total_testcases == 0:
        return ScoringResult(
            base_score=0,
            time_bonus=0,
            memory_bonus=0,
            penalty=0,
            final_score=0,
            breakdown={"error": "No testcases"}
        )
    
    pass_rate = testcases_passed / total_testcases
    
    # Base score calculation
    base_score = pass_rate * question_points
    
    # Time bonus (only if passed at least 50%)
    time_bonus = 0
    if pass_rate >= 0.5 and execution_time_ms > 0:
        if execution_time_ms < average_time_ms:
            time_bonus = base_score * 0.05  # 5% bonus
    
    # Memory efficiency bonus
    memory_bonus = 0
    if pass_rate >= 0.5 and memory_used_mb > 0:
        if memory_used_mb < average_memory_mb:
            memory_bonus = base_score * 0.05  # 5% bonus
    
    # Penalty for failed testcases after 50% pass rate
    penalty = 0
    if pass_rate > 0.5:
        failed_after_50 = total_testcases - testcases_passed
        penalty = min(failed_after_50 * (base_score * 0.10), base_score * 0.3)  # Cap at 30%
    
    # Calculate final score
    final_score = base_score + time_bonus + memory_bonus - penalty
    final_score = max(0, min(final_score, question_points * 1.1))  # Cap at 110% max
    
    return ScoringResult(
        base_score=round(base_score, 2),
        time_bonus=round(time_bonus, 2),
        memory_bonus=round(memory_bonus, 2),
        penalty=round(penalty, 2),
        final_score=round(final_score, 2),
        breakdown={
            "pass_rate": round(pass_rate * 100, 1),
            "testcases_passed": testcases_passed,
            "total_testcases": total_testcases,
            "formula": "base + time_bonus + memory_bonus - penalty"
        }
    )


def combine_scores(
    rule_based_score: float,
    ai_score: float,
    rule_weight: float = 0.7,
    ai_weight: float = 0.3
) -> float:
    """
    Combine rule-based and AI scores.
    
    Formula: final = (rule_based * 0.7) + (ai_score * 10 * 0.3)
    Note: AI score is on 1-10 scale, normalized to 100 scale
    
    Args:
        rule_based_score: Score from testcase execution (0-100)
        ai_score: Score from AI evaluation (0-10)
        rule_weight: Weight for rule-based score
        ai_weight: Weight for AI score
    
    Returns:
        Combined final score
    """
    # Normalize AI score to 100 scale
    normalized_ai = ai_score * 10
    
    final = (rule_based_score * rule_weight) + (normalized_ai * ai_weight)
    return round(final, 2)
