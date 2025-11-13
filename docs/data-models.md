## Data Models

User
- name: string
- email: string
- password_hash: string
- role: enum (admin|user|auditor)
- createdAt: datetime

Dataset
- name: string
- type: string
- ownerId: reference to User
- uploadDate: datetime

Analysis
- datasetId: reference to Dataset
- biasMetrics: object
- modelInfo: object
- timestamp: datetime

Report
- analysisId: reference to Analysis
- summary: object
- visualizationURL: string
- complianceScore: number
