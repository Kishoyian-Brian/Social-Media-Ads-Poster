import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Router from './router'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  )
}

export default App
