import React from 'react'
import StatsCard from '../components/StatsCard'
import ChartCard from '../components/ChartCard'

export default function Dashboard(){
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatsCard title="Fairness Score" value="92.5" />
        <StatsCard title="Compliance Index" value="85" />
        <StatsCard title="Active Datasets" value="3" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Bias Distribution" />
        <ChartCard title="Fairness Metrics" />
      </div>
    </div>
  )
}
