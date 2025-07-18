# AI Network Whisperer Backend (TypeScript)

A TypeScript/Node.js backend with Express and Socket.IO for the AI Network Whisperer application. This backend handles network device connections, LLM integration, and real-time communication with the frontend.

## Features

- **Express REST API** for device and API key management
- **Socket.IO support** for real-time communication
- **LLM Integration** with Groq, OpenAI, Claude, and Ollama
- **Network Device Management** with SSH connections
- **Configuration Generation** from natural language commands
- **Real-time Device Status** monitoring
- **API Key Management** with secure storage
- **TypeScript** for type safety and better development experience
- **Winston Logging** for comprehensive logging
- **Rate Limiting** for API protection
- **Input Validation** with Joi

## Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend-ts
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

## Configuration

Edit the `.env` file with your settings:

```env
# Server Configuration
HOST=0.0.0.0
PORT=5000
NODE_ENV=development
SECRET_KEY=your-secret-key-here

# LLM Provider API Keys
GROQ_API_KEY=your-groq-api-key-here
OPENAI_API_KEY=your-openai-api-key-here

# Network Device Credentials
DEFAULT_SSH_USERNAME=admin
DEFAULT_SSH_PASSWORD=your-password
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

### REST API

- `GET /health` - Health check
- `GET /api/devices` - Get all devices
- `POST /api/devices` - Add new device
- `DELETE /api/devices/:id` - Delete device
- `GET /api/devices/:id` - Get device info
- `GET /api/devices/:id/status` - Get device status
- `GET /api/api-keys` - Get API keys (masked)
- `POST /api/api-keys` - Add new API key
- `DELETE /api/api-keys/:id` - Delete API key
- `GET /api/api-keys/usage` - Get usage statistics

### WebSocket Events

#### Client to Server:
- `select_device` - Select a device
- `connect_device` - Connect to device
- `disconnect_device` - Disconnect from device
- `generate_config` - Generate configuration
- `apply_config` - Apply configuration to device
- `get_device_status` - Get device status

#### Server to Client:
- `connected` - Connection established
- `device_selected` - Device selection confirmed
- `device_connected` - Device connection successful
- `device_disconnected` - Device disconnection confirmed
- `config_generated` - Configuration generated
- `config_applied` - Configuration applied
- `error` - Error occurred

## Project Structure

```
backend-ts/
├── src/
│   ├── config/
│   │   └── config.ts          # Configuration management
│   ├── middleware/
│   │   ├── errorHandler.ts    # Error handling middleware
│   │   ├── rateLimiter.ts     # Rate limiting middleware
│   │   └── validation.ts      # Input validation middleware
│   ├── routes/
│   │   ├── devices.ts         # Device management routes
│   │   └── apiKeys.ts         # API key management routes
│   ├── services/
│   │   ├── NetworkOperations.ts # Network device operations
│   │   └── LLMIntegration.ts    # LLM provider integration
│   ├── socket/
│   │   └── socketHandlers.ts    # Socket.IO event handlers
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── utils/
│   │   └── logger.ts           # Winston logger configuration
│   └── server.ts               # Main server file
├── dist/                       # Compiled JavaScript files
├── package.json               # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## LLM Providers

### Groq
- Fast inference with Llama models
- Requires API key from Groq
- Model: `llama3-8b-8192`

### OpenAI
- GPT-3.5-turbo for configuration generation
- Requires OpenAI API key
- Model: `gpt-3.5-turbo`

### Ollama (Local)
- Run models locally
- No API key required
- Default model: `llama2`
- Configure URL in environment variables

### Demo Mode
- Fallback when no LLM providers are available
- Generates sample configurations
- Useful for testing and development

## Network Device Support

### Supported Devices
- Cisco IOS/IOS-XE routers and switches
- Cisco ASA firewalls
- Cisco WLC (Wireless LAN Controllers)
- Other devices with SSH support

### Connection Methods
- SSH (primary)
- Simulated connections for demo purposes

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

### Adding New Features

1. **New LLM Provider**: Add to `LLMIntegration.ts`
2. **New Device Type**: Update `NetworkOperations.ts`
3. **New API Endpoint**: Add to appropriate route file
4. **New Socket Event**: Add to `socketHandlers.ts`

## Security Features

- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Validates all incoming data
- **Error Handling**: Secure error responses
- **CORS Configuration**: Configurable cross-origin requests
- **Environment Variables**: Secure configuration management

## Logging

The application uses Winston for comprehensive logging:

- **Console**: Colored output for development
- **File**: All logs saved to `network_whisperer.log`
- **Error File**: Errors saved to `error.log`
- **Exception Handling**: Uncaught exceptions logged
- **Rejection Handling**: Unhandled promise rejections logged

## Monitoring

- Health check endpoint at `/health`
- Usage statistics for LLM providers
- Connection history tracking
- Real-time device status monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## License

This project is licensed under the MIT License.
