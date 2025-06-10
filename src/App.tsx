import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Index from './pages/Index'
import Setlist from './pages/Setlist'
import Song from './pages/Song'
import Parameters from './pages/Parameters'
import NotFound from './pages/NotFound'

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className='h-screen max-h-screen overflow-hidden flex flex-col'>
        <BrowserRouter>
          <Routes>
            {' '}
            <Route path='/' element={<Index />} />
            <Route path='/setlist/:id' element={<Setlist />} />
            <Route path='/song/:id' element={<Song />} />
            <Route path='/parameters' element={<Parameters />} />
            <Route path='*' element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
