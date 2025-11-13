import React from 'react'

export default function ChartCard({title}){
  return (
    <div className="bg-white p-4 rounded shadow h-64">
      <div className="text-sm text-gray-500 mb-2">{title}</div>
      <div className="flex-1 flex items-center justify-center text-gray-400">Chart placeholder</div>
    </div>
  )
}
