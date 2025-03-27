import SocketContext from "@/context/socket";
import useGetUsersDashboard from "@/hooks/admin/useGetUsersDashboard";
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import { useContext, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

const CustomTooltip = ({ payload, label, active }) => {
  if (active && payload) {
    return (
      <Box
        sx={{
          background: "white",
          borderRadius: "1rem",
          padding: "1rem",
        }}
      >
        <Typography>{payload?.[0]?.payload?.name}</Typography>
        <Typography>
          {payload?.[0]?.name} : {payload?.[0]?.value}
        </Typography>
      </Box>
    );
  }

  return null;
};
const RESULTS_DATE_RANGE = 7;

const User = () => {
  const { socket } = useContext(SocketContext);

  const fromDate = dayjs().subtract(RESULTS_DATE_RANGE, "day");
  const toDate = dayjs();
  const { data, refetch } = useGetUsersDashboard({
    fromDate: `${fromDate.get("year")}/${fromDate.get("month") + 1}/${fromDate.get("date")}`,
    toDate: `${toDate.get("year")}/${toDate.get("month") + 1}/${toDate.get("date")}`,
  });

  useEffect(() => {
    if (socket) {
      socket.on(`admin:refetch-data-users-dashboard`, () => {
        refetch();
      });
      return () => {
        socket.off(`admin:refetch-data-users-dashboard`);
      };
    }
  }, [socket]);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          color: "#201c58",
          boxShadow: "0px 1px 22px -12px #607D8B",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography
            sx={{
              fontSize: "2rem",
              fontWeight: "bold",
            }}
          >
            {data?.metadata?.totalUsers ?? 0}
          </Typography>
          <Typography>Tổng người dùng mới</Typography>
        </Box>
        <ResponsiveContainer width={"100%"} height={150}>
          <AreaChart
            data={data?.data ?? []}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            {/* <CartesianGrid strokeDasharray="3 3" /> */}
            {/* <XAxis dataKey="name" /> */}
            {/* <YAxis /> */}
            <Tooltip
              labelStyle={{
                fontSize: "1.2rem",
              }}
              itemStyle={{
                fontSize: "1.2rem",
              }}
              content={<CustomTooltip />}
            />
            <Area type="monotone" dataKey="value" name="User mới" stroke="#35d1ec" fill="#84b3e1" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </>
  );
};
export default User;
