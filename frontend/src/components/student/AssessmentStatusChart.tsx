import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface AssessmentStatusData {
  completed: number;
  pending: number;
  failed: number;
}

interface AssessmentStatusChartProps {
  data: AssessmentStatusData;
}

const AssessmentStatusChart: React.FC<AssessmentStatusChartProps> = ({ data }) => {
  const chartData = [
    { name: "Completed", value: data.completed, color: "#10B981" },
    { name: "Pending", value: data.pending, color: "#F59E0B" },
    { name: "Failed", value: data.failed, color: "#EF4444" },
  ];

  const total = data.completed + data.pending + data.failed;

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: (typeof chartData)[0];
    }>;
  }

  const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : "0";
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">Count: {data.value}</p>
          <p className="text-sm">Percentage: {percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AssessmentStatusChart;
