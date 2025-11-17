"""
Synthetic Data Generator for Model Validation

Generates diverse synthetic test cases across sensitive attributes:
- Gender, ethnicity, age, disability, economic status
- Edge cases and rare combinations
- 100-500 cases per validation run
"""
import random
import itertools
from typing import List, Dict, Any
from datetime import datetime, timedelta


# Sensitive attribute variants
GENDERS = ["male", "female", "non-binary", "prefer_not_to_say"]
ETHNICITIES = ["caucasian", "african_american", "hispanic", "asian", "native_american", "middle_eastern", "mixed"]
AGE_GROUPS = [(18, 25), (26, 35), (36, 45), (46, 55), (56, 65), (66, 80)]
DISABILITY_STATUS = [None, "mobility", "visual", "hearing", "cognitive", "none_disclosed"]
ECONOMIC_STATUS = ["low_income", "lower_middle", "middle", "upper_middle", "high_income"]
EMPLOYMENT_STATUS = ["employed", "unemployed", "self_employed", "student", "retired"]
EDUCATION_LEVELS = ["high_school", "some_college", "bachelor", "master", "doctorate"]
MARITAL_STATUS = ["single", "married", "divorced", "widowed"]


def generate_synthetic_cases(count: int = 200, include_edge_cases: bool = True) -> List[Dict[str, Any]]:
    """
    Generate synthetic test cases for model validation.
    
    Args:
        count: Number of cases to generate (100-500)
        include_edge_cases: Whether to include rare/extreme scenarios
    
    Returns:
        List of synthetic applicant scenarios
    """
    cases = []
    edge_case_count = min(count // 10, 20) if include_edge_cases else 0
    regular_case_count = count - edge_case_count
    
    # Generate regular diverse cases
    for i in range(regular_case_count):
        cases.append(_generate_regular_case(i))
    
    # Generate edge cases
    if include_edge_cases:
        for i in range(edge_case_count):
            cases.append(_generate_edge_case(i + regular_case_count))
    
    # Shuffle to avoid patterns
    random.shuffle(cases)
    
    return cases


def _generate_regular_case(case_id: int) -> Dict[str, Any]:
    """Generate a regular synthetic case with typical attribute combinations."""
    age_group = random.choice(AGE_GROUPS)
    age = random.randint(age_group[0], age_group[1])
    
    # Correlate some attributes realistically
    employment = random.choice(EMPLOYMENT_STATUS)
    if age < 22:
        employment = random.choice(["student", "employed", "unemployed"])
    elif age > 65:
        employment = random.choice(["retired", "employed"])
    
    economic = random.choice(ECONOMIC_STATUS)
    if employment == "unemployed":
        economic = random.choice(["low_income", "lower_middle"])
    elif employment == "retired":
        economic = random.choice(["lower_middle", "middle", "upper_middle"])
    
    education = random.choice(EDUCATION_LEVELS)
    if age < 25:
        education = random.choice(["high_school", "some_college", "bachelor"])
    
    # Generate financial attributes
    income = _generate_income(economic, employment)
    credit_score = _generate_credit_score(economic)
    loan_amount = _generate_loan_amount(income, economic)
    
    return {
        "case_id": f"synthetic_{case_id}",
        "timestamp": (datetime.now() - timedelta(days=random.randint(0, 365))).isoformat(),
        "applicant": {
            "age": age,
            "gender": random.choice(GENDERS),
            "ethnicity": random.choice(ETHNICITIES),
            "disability": random.choice(DISABILITY_STATUS),
            "marital_status": random.choice(MARITAL_STATUS),
            "education": education,
        },
        "financial": {
            "employment_status": employment,
            "economic_status": economic,
            "annual_income": income,
            "credit_score": credit_score,
            "existing_debt": random.randint(0, int(income * 0.5)) if income > 0 else 0,
            "savings": random.randint(0, int(income * 2)),
        },
        "request": {
            "loan_amount": loan_amount,
            "loan_purpose": random.choice(["home", "education", "business", "auto", "personal", "medical"]),
            "loan_term_months": random.choice([12, 24, 36, 48, 60, 84, 120, 180, 240, 360]),
        }
    }


def _generate_edge_case(case_id: int) -> Dict[str, Any]:
    """Generate edge cases: extreme or rare attribute combinations."""
    edge_type = random.choice([
        "very_young_high_income",
        "very_old_low_income",
        "high_income_bad_credit",
        "low_income_excellent_credit",
        "multiple_disadvantages",
        "extreme_loan_amount",
        "unusual_combination"
    ])
    
    base_case = _generate_regular_case(case_id)
    
    if edge_type == "very_young_high_income":
        base_case["applicant"]["age"] = random.randint(18, 23)
        base_case["financial"]["annual_income"] = random.randint(150000, 300000)
        base_case["financial"]["economic_status"] = "high_income"
    
    elif edge_type == "very_old_low_income":
        base_case["applicant"]["age"] = random.randint(75, 85)
        base_case["financial"]["annual_income"] = random.randint(15000, 30000)
        base_case["financial"]["economic_status"] = "low_income"
        base_case["financial"]["employment_status"] = "retired"
    
    elif edge_type == "high_income_bad_credit":
        base_case["financial"]["annual_income"] = random.randint(120000, 250000)
        base_case["financial"]["credit_score"] = random.randint(300, 550)
        base_case["financial"]["existing_debt"] = int(base_case["financial"]["annual_income"] * 0.8)
    
    elif edge_type == "low_income_excellent_credit":
        base_case["financial"]["annual_income"] = random.randint(25000, 40000)
        base_case["financial"]["credit_score"] = random.randint(780, 850)
        base_case["financial"]["existing_debt"] = 0
    
    elif edge_type == "multiple_disadvantages":
        base_case["applicant"]["age"] = random.randint(18, 22)
        base_case["applicant"]["disability"] = random.choice(["mobility", "visual", "hearing", "cognitive"])
        base_case["financial"]["employment_status"] = "unemployed"
        base_case["financial"]["annual_income"] = random.randint(0, 20000)
        base_case["financial"]["economic_status"] = "low_income"
        base_case["financial"]["credit_score"] = random.randint(300, 600)
    
    elif edge_type == "extreme_loan_amount":
        base_case["request"]["loan_amount"] = random.randint(500000, 2000000)
        base_case["financial"]["annual_income"] = random.randint(200000, 500000)
    
    elif edge_type == "unusual_combination":
        base_case["applicant"]["age"] = random.randint(70, 80)
        base_case["financial"]["employment_status"] = "student"
        base_case["applicant"]["education"] = "doctorate"
        base_case["request"]["loan_purpose"] = "education"
    
    base_case["case_id"] = f"synthetic_edge_{case_id}"
    base_case["edge_case"] = edge_type
    
    return base_case


def _generate_income(economic_status: str, employment_status: str) -> int:
    """Generate realistic income based on economic status and employment."""
    if employment_status == "unemployed":
        return random.randint(0, 15000)
    elif employment_status == "student":
        return random.randint(5000, 30000)
    elif employment_status == "retired":
        return random.randint(20000, 80000)
    
    # Employed/self-employed
    income_ranges = {
        "low_income": (15000, 35000),
        "lower_middle": (35000, 55000),
        "middle": (55000, 85000),
        "upper_middle": (85000, 150000),
        "high_income": (150000, 500000),
    }
    
    range_min, range_max = income_ranges.get(economic_status, (40000, 80000))
    return random.randint(range_min, range_max)


def _generate_credit_score(economic_status: str) -> int:
    """Generate credit score with correlation to economic status."""
    score_ranges = {
        "low_income": (500, 680),
        "lower_middle": (600, 720),
        "middle": (650, 760),
        "upper_middle": (700, 820),
        "high_income": (720, 850),
    }
    
    range_min, range_max = score_ranges.get(economic_status, (600, 750))
    return random.randint(range_min, range_max)


def _generate_loan_amount(income: int, economic_status: str) -> int:
    """Generate loan amount proportional to income."""
    if income == 0:
        return random.randint(5000, 20000)
    
    # Loan typically 0.5x to 4x annual income
    min_loan = max(5000, int(income * 0.3))
    max_loan = int(income * 4)
    
    return random.randint(min_loan, max_loan)


def get_dataset_stats(cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate statistics about the generated dataset."""
    total = len(cases)
    
    # Count by sensitive attributes
    gender_counts = {}
    ethnicity_counts = {}
    disability_counts = {}
    age_distribution = {"18-25": 0, "26-35": 0, "36-45": 0, "46-55": 0, "56-65": 0, "66+": 0}
    economic_counts = {}
    
    for case in cases:
        # Gender
        gender = case["applicant"]["gender"]
        gender_counts[gender] = gender_counts.get(gender, 0) + 1
        
        # Ethnicity
        ethnicity = case["applicant"]["ethnicity"]
        ethnicity_counts[ethnicity] = ethnicity_counts.get(ethnicity, 0) + 1
        
        # Disability
        disability = case["applicant"]["disability"]
        disability_key = disability if disability else "none"
        disability_counts[disability_key] = disability_counts.get(disability_key, 0) + 1
        
        # Age distribution
        age = case["applicant"]["age"]
        if age <= 25:
            age_distribution["18-25"] += 1
        elif age <= 35:
            age_distribution["26-35"] += 1
        elif age <= 45:
            age_distribution["36-45"] += 1
        elif age <= 55:
            age_distribution["46-55"] += 1
        elif age <= 65:
            age_distribution["56-65"] += 1
        else:
            age_distribution["66+"] += 1
        
        # Economic status
        economic = case["financial"]["economic_status"]
        economic_counts[economic] = economic_counts.get(economic, 0) + 1
    
    edge_cases = [c for c in cases if "edge_case" in c]
    
    return {
        "total_cases": total,
        "edge_cases_count": len(edge_cases),
        "regular_cases_count": total - len(edge_cases),
        "gender_distribution": {k: v / total for k, v in gender_counts.items()},
        "ethnicity_distribution": {k: v / total for k, v in ethnicity_counts.items()},
        "disability_distribution": {k: v / total for k, v in disability_counts.items()},
        "age_distribution": {k: v / total for k, v in age_distribution.items()},
        "economic_distribution": {k: v / total for k, v in economic_counts.items()},
    }
