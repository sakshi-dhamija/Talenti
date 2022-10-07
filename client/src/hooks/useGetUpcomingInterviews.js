import { useQuery } from "react-query";
import axios from "axios";

export default function useGetUpcomingInterviews() {
  return useQuery("interviews", () => {
    return axios.get(`http://localhost:8000/api/interviews/upcoming`).then((res) => res.data);
  });
}
