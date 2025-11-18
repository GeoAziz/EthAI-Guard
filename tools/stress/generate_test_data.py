#!/usr/bin/env python3
"""
Generate synthetic test datasets for stress testing
Creates realistic credit scoring data with various sizes
"""

import json
import random
from typing import List, Dict, Any

def generate_dataset(size: int, seed: int = 42) -> List[Dict[str, Any]]:
    """Generate synthetic credit scoring dataset"""
    random.seed(seed)
    
    genders = ['male', 'female']
    age_groups = ['18-25', '26-35', '36-45', '46-55', '56+']
    ethnicities = ['group_a', 'group_b', 'group_c', 'group_d']
    
    data = []
    
    for i in range(size):
        # Generate correlated features (more realistic)
        credit_score = random.randint(500, 900)
        
        # Income correlates with credit score
        base_income = 30000 + (credit_score - 500) * 200
        income = int(base_income + random.gauss(0, 15000))
        income = max(20000, min(200000, income))
        
        # Debt ratio inversely correlates with credit score
        base_debt_ratio = 0.6 - (credit_score - 500) / 1000
        debt_ratio = base_debt_ratio + random.gauss(0, 0.1)
        debt_ratio = max(0, min(0.8, debt_ratio))
        
        employment_years = random.randint(0, 35)
        existing_credit_lines = random.randint(0, 12)
        
        age = random.choice(age_groups)
        gender = random.choice(genders)
        ethnicity = random.choice(ethnicities)
        
        # Approval logic (based on credit score, debt ratio)
        approval_probability = (credit_score - 500) / 400 * (1 - debt_ratio)
        approved = random.random() < approval_probability
        
        # Add some missing data (5% randomly missing)
        record = {
            'id': f'record_{i:06d}',
            'credit_score': credit_score if random.random() > 0.02 else None,
            'income': income if random.random() > 0.03 else None,
            'debt_to_income_ratio': round(debt_ratio, 3),
            'employment_years': employment_years,
            'existing_credit_lines': existing_credit_lines,
            'age': age,
            'gender': gender,
            'ethnicity': ethnicity,
            'approved': approved
        }
        
        data.append(record)
    
    return data


def save_dataset(data: List[Dict], filename: str):
    """Save dataset to JSON file"""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"✅ Generated {len(data)} records -> {filename}")


def main():
    """Generate all test datasets"""
    print("\n🔧 Generating synthetic test datasets...\n")
    
    sizes = {
        'payload_100.json': 100,
        'payload_500.json': 500,
        'payload_1000.json': 1000,
        'payload_5000.json': 5000
    }
    
    for filename, size in sizes.items():
        data = generate_dataset(size)
        save_dataset(data, f"data/{filename}")
    
    # Generate sample record for explainability tests
    sample = {
        'id': 'sample_record_001',
        'credit_score': 720,
        'income': 65000,
        'debt_to_income_ratio': 0.35,
        'employment_years': 8,
        'existing_credit_lines': 3,
        'age': '36-45',
        'gender': 'female',
        'ethnicity': 'group_a'
    }
    
    with open('data/sample_record.json', 'w') as f:
        json.dump(sample, f, indent=2)
    print(f"✅ Generated sample record -> data/sample_record.json")
    
    print("\n✅ All test datasets generated successfully!\n")


if __name__ == '__main__':
    main()
