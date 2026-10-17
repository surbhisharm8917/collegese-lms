import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface QuizTrendData {
  date: string;
  score: number;
  quizName: string;
}

interface QuizTrendChartProps {
  data: QuizTrendData[];
}

const QuizTrendChart: React.FC<QuizTrendChartProps> = ({ data }) => {
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: QuizTrendData;
    }>;
  }

  const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{data.quizName}</p>
          <p className="text-sm">Date: {data.date}</p>
          <p className="text-sm">Score: {data.score}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis
            domain={[0, 100]}
            label={{ value: "Score (%)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={{ fill: "#3B82F6", strokeWidth: 2, r: 6 }}
            activeDot={{ r: 8, stroke: "#3B82F6", strokeWidth: 2, fill: "#fff" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default QuizTrendChart;
