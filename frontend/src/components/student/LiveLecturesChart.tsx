import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface LiveLecturesData {
  totalParticipated: number;
  upcomingLectures: number;
  ongoingLectures: number;
  completedLectures: number;
  recentParticipation: number;
  courseParticipation: Array<{
    course: string;
    count: number;
  }>;
}

interface LiveLecturesChartProps {
  data: LiveLecturesData;
}

const LiveLecturesChart: React.FC<LiveLecturesChartProps> = ({ data }) => {
  const statusData = [
    { name: "Completed", value: data.completedLectures, color: "#10B981" },
    { name: "Upcoming", value: data.upcomingLectures, color: "#3B82F6" },
    { name: "Ongoing", value: data.ongoingLectures, color: "#F59E0B" },
  ];
  const courseData = data.courseParticipation.map((item) => ({
    name: item.course.length > 15 ? item.course.substring(0, 15) + "..." : item.course,
    fullName: item.course,
    count: item.count,
  }));

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: {
        name?: string;
        fullName?: string;
        count?: number;
        value?: number;
      };
    }>;
  }

  const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{data.fullName || data.name}</p>
          <p className="text-sm">Lectures: {data.count || data.value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border">
          <h4 className="text-sm font-medium text-blue-800">Total Participated</h4>
          <p className="text-2xl font-bold text-blue-600">{data.totalParticipated}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border">
          <h4 className="text-sm font-medium text-green-800">Completed</h4>
          <p className="text-2xl font-bold text-green-600">{data.completedLectures}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border">
          <h4 className="text-sm font-medium text-yellow-800">Upcoming</h4>
          <p className="text-2xl font-bold text-yellow-600">{data.upcomingLectures}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border">
          <h4 className="text-sm font-medium text-purple-800">Recent (30d)</h4>
          <p className="text-2xl font-bold text-purple-600">{data.recentParticipation}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4 text-center">Lecture Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="border p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4 text-center">Participation by Course</h3>
          {courseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={courseData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No course participation data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveLecturesChart;
