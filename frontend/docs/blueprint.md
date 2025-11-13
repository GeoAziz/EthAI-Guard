# **App Name**: EthixAI Dashboard

## Core Features:

- Bias Detection with FairLens: Analyze datasets for bias using statistical parity, equal opportunity, and disparate impact metrics. Visualize fairness using interactive bar graphs and heatmaps.
- Explainability Dashboard with ExplainBoard: Provide explainability for AI models using SHAP summary plots, force plots, and dependence plots. Export visualizations as images or PDFs.
- Ethical Compliance Scoring: Calculate and display an ethical compliance score based on CBK-aligned metrics. Provide a list of violations and recommendations for improvement.
- Secure Authentication: Implement secure user authentication using Firebase Auth (email/password).
- Dataset Upload and Preview: Allow users to upload datasets (CSV) via drag-and-drop. Preview the first 10 rows of the data. Provide the option to load an example dataset.
- Report Viewer: Enable viewing saved reports with fairness and explainability charts, compliance summaries, and export options.
- Dynamic Dashboard: A core interaction hub that incorporate all core features for bias, explainability, and compliance into a single app. The app includes functionality that uses Firebase Auth to connect users securely, and will offer Firestore so that user preferences, API key etc. are kept securely

## Style Guidelines:

- Primary color: Deep navy blue (#0D1117) to establish trust and a professional atmosphere.
- Background color: Dark grey (#161B22), a slightly lighter desaturated version of the primary.
- Accent color: Forest green (#2EA043) for key actions, highlights, and positive compliance indicators.
- UI font: 'Inter', a sans-serif font, for a clear and modern UI. Note: currently only Google Fonts are supported.
- Data font: 'JetBrains Mono', a monospaced font, specifically for metrics and data display. Note: currently only Google Fonts are supported.
- Use consistent icons from Font Awesome or similar library for key actions and data visualizations.
- Implement a grid-based layout (12 columns) with rounded corners and soft shadows for a modern, clean design.
- Use Framer Motion for smooth reveal and transition animations, enhancing the user experience.