import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TooltipProps } from "recharts";

interface CourseProgressData {
  courseId: string;
  courseName: string;
  progress: number;
  status: string;
  totalModules: number;
}

interface CourseProgressChartProps {
  data: CourseProgressData[];
}

interface ChartDataItem {
  name: string;
  progress: number;
  status: string;
  fullName: string;
}

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataItem;
  }>;
}

const CourseProgressChart: React.FC<CourseProgressChartProps> = ({ data }) => {
  const chartData = data.map((item) => ({
    name: item.courseName.length > 15 ? item.courseName.substring(0, 15) + "..." : item.courseName,
    progress: item.progress,
    status: item.status,
    fullName: item.courseName,
  }));

  const getBarColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "#10B981";
      case "IN_PROGRESS":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{data.fullName}</p>
          <p className="text-sm">Progress: {data.progress}%</p>
          <p className="text-sm">Status: {data.status}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
          <YAxis
            domain={[0, 100]}
            label={{ value: "Progress (%)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CourseProgressChart;
