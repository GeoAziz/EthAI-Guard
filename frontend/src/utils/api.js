import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const client = axios.create({ baseURL: API_BASE, timeout: 5000 })

export function login(payload){
  return client.post('/auth/login', payload)
}

export function getReports(userId){
  return client.get(`/reports/${userId}`)
}

export default client
