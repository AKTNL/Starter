import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Orders } from '@/pages/Orders'
import { Products } from '@/pages/Products'
import { Settings } from '@/pages/Settings'
import { Users } from '@/pages/Users'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="orders" element={<Orders />} />
        <Route path="products" element={<Products />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
