import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 10000,
});

export const fetchGraph = async () => {
  const response = await api.get("/graph");
  return response.data;
};

export const fetchStats = async () => {
  const response = await api.get("/stats");
  return response.data;
};

export const fetchVendorDetails = async (id) => {
  const response = await api.get(`/vendor/${id}`);
  return response.data;
};

export const fetchPgpDetails = async (id) => {
  const response = await api.get(`/pgp/${id}`);
  return response.data;
};

export const searchNodes = async (query) => {
  const response = await api.get("/search", {
    params: { q: query },
  });
  return response.data;
};

export const fetchByPath = async (path) => {
  const response = await api.get(path);
  return response.data;
};
