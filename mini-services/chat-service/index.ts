// WebSocket Chat Service for Real-time Updates
import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Types for real-time events
interface ConversationUpdate {
  conversationId: string
  type: 'new_message' | 'status_change' | 'lead_update'
  data: any
}

interface NewMessage {
  id: string
  conversationId: string
  content: string
  direction: 'incoming' | 'outgoing'
  createdAt: Date
}

// Store connected admin clients
const adminClients = new Set<string>()

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Admin joins dashboard
  socket.on('admin:join', () => {
    adminClients.add(socket.id)
    socket.join('admin-room')
    console.log(`Admin ${socket.id} joined dashboard`)
    socket.emit('admin:joined', { timestamp: new Date().toISOString() })
  })

  // Admin leaves dashboard
  socket.on('admin:leave', () => {
    adminClients.delete(socket.id)
    socket.leave('admin-room')
    console.log(`Admin ${socket.id} left dashboard`)
  })

  // Subscribe to specific conversation
  socket.on('conversation:subscribe', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`)
    console.log(`Client ${socket.id} subscribed to conversation ${conversationId}`)
  })

  // Unsubscribe from conversation
  socket.on('conversation:unsubscribe', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`)
    console.log(`Client ${socket.id} unsubscribed from conversation ${conversationId}`)
  })

  // Handle incoming webhook message (called from API)
  socket.on('webhook:message', (data: { platform: string, message: any }) => {
    // Broadcast to all admin clients
    io.to('admin-room').emit('conversation:new_message', data)
  })

  // Handle typing indicator
  socket.on('conversation:typing', (data: { conversationId: string, isTyping: boolean }) => {
    socket.to(`conversation:${data.conversationId}`).emit('conversation:typing', data)
  })

  // Handle lead status update
  socket.on('lead:update', (data: { conversationId: string, status: string, score: number }) => {
    io.to('admin-room').emit('lead:updated', data)
  })

  // Handle flow execution
  socket.on('flow:execute', (data: { flowId: string, conversationId: string }) => {
    io.to('admin-room').emit('flow:started', data)
  })

  socket.on('flow:complete', (data: { flowId: string, conversationId: string, result: any }) => {
    io.to('admin-room').emit('flow:completed', data)
  })

  socket.on('disconnect', () => {
    adminClients.delete(socket.id)
    console.log(`Client disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

// Export function to emit events from API routes
export function emitNewMessage(conversationId: string, message: NewMessage) {
  io.to(`conversation:${conversationId}`).emit('message:new', message)
  io.to('admin-room').emit('conversation:updated', { conversationId, message })
}

export function emitLeadUpdate(conversationId: string, data: any) {
  io.to('admin-room').emit('lead:updated', { conversationId, ...data })
}

export function emitConversationUpdate(conversationId: string, type: string, data: any) {
  io.to('admin-room').emit('conversation:updated', { conversationId, type, data })
}

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})
