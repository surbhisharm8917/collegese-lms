import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";

interface EnrolledCourse {
  courseId: string;
  courseName: string;
  progress: number;
  status: string;
  enrolledAt: string;
}

interface EnrolledCoursesData {
  courses: EnrolledCourse[];
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  totalCourses: number;
}

interface EnrolledCoursesChartProps {
  data: EnrolledCoursesData;
}

const COLORS = {
  ENROLLED: "#3B82F6",
  IN_PROGRESS: "#10B981",
  COMPLETED: "#8B5CF6",
  DROPPED: "#EF4444",
};

const EnrolledCoursesChart: React.FC<EnrolledCoursesChartProps> = ({ data }) => {
  const courseProgressData = data.courses.map((course) => ({
    name:
      course.courseName.length > 20
        ? course.courseName.substring(0, 20) + "..."
        : course.courseName,
    progress: course.progress,
    status: course.status,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-md font-semibold mb-4 text-center">Course Status Breakdown</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.statusBreakdown}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(props: PieLabelRenderProps & { status?: string; count?: number }) =>
                `${props.status}: ${props.count}`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {data.statusBreakdown.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.status as keyof typeof COLORS] || "#8884d8"}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h4 className="text-md font-semibold mb-4 text-center">Individual Course Progress</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={courseProgressData}
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
              label={{ value: "Progress (%)", angle: -90, position: "insideLeft" }}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, "Progress"]}
              labelFormatter={(label) => `Course: ${label}`}
            />
            <Bar dataKey="progress" fill="#3B82F6" radius={[4, 4, 0, 0]}>
              {courseProgressData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.status as keyof typeof COLORS] || "#8884d8"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{data.totalCourses}</div>
          <div className="text-sm text-blue-800">Total Enrolled</div>
        </div>
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {data.statusBreakdown.find((s) => s.status === "COMPLETED")?.count || 0}
          </div>
          <div className="text-sm text-green-800">Completed (100%)</div>
        </div>
      </div>
    </div>
  );
};

export default EnrolledCoursesChart;
