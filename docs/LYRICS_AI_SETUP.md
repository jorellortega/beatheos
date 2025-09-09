# Lyrics AI Setup Guide

This guide will help you set up the Lyrics AI feature in your Beatheos application.

## 🚀 Features

The Lyrics AI system provides:

- **Multi-format writing support**: Scripts, lyrics, poetry, and prose
- **Version control**: Create, edit, and manage multiple versions of content
- **Inline editing**: Real-time editing with text locking capabilities
- **AI integration**: AI-powered text generation and editing using OpenAI and Anthropic
- **Text-to-speech**: Convert written content to audio using ElevenLabs
- **File import**: Import and extract text from PDFs, Word docs, and text files
- **Advanced text features**: Text locking, AI generation around locked sections

## 📋 Prerequisites

1. **Database**: MySQL/MariaDB with the existing Beatheos schema
2. **API Keys**: You'll need API keys for:
   - OpenAI (for GPT-4 text generation)
   - Anthropic (for Claude text generation)
   - ElevenLabs (for text-to-speech)

## 🛠️ Installation

### 1. Install Dependencies

```bash
npm install openai @anthropic-ai/sdk pdfjs-dist mammoth
```

### 2. Database Setup

Run the migration file to create the necessary tables:

```bash
# Connect to your MySQL database and run:
mysql -u your_username -p your_database < migrations/20241220_lyrics_ai_tables.sql
```

### 3. Environment Variables

Add these environment variables to your `.env.local` file:

```env
# AI Service API Keys (optional - users can provide their own)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

## 🎯 Usage

### Accessing the Feature

1. Navigate to `/lyrics-ai` in your application
2. Make sure you're logged in with a valid user account
3. The interface will load with your existing content

### Creating Content

1. **New Content**: Click "New [content type]" to create new content
2. **Import**: Use the Import button to upload files (PDF, DOCX, TXT)
3. **Manual Input**: Use the manual text input in the import dialog

### AI Features

#### Text Generation
1. Select content and click "AI Edit"
2. Choose your AI service (OpenAI or Anthropic)
3. Enter your API key
4. Use quick prompts or create custom prompts
5. Generate and review the AI-generated text

#### Text-to-Speech
1. Select content and click "TTS"
2. Enter your ElevenLabs API key
3. Choose a voice
4. Generate and play the audio

### Text Locking
1. Select text in the content editor
2. Click the lock icon to preserve that section
3. AI generation will work around locked sections

## 🔧 API Endpoints

The system creates these API endpoints:

- `POST /api/lyrics-ai/generate-text` - AI text generation
- `POST /api/lyrics-ai/text-to-speech` - Text-to-speech conversion
- `POST /api/lyrics-ai/get-voices` - Get available voices
- `GET /api/lyrics-ai/assets` - Get user assets
- `POST /api/lyrics-ai/assets` - Create new asset
- `PUT /api/lyrics-ai/assets/[id]` - Update asset
- `DELETE /api/lyrics-ai/assets/[id]` - Delete asset
- `GET /api/lyrics-ai/lyrics` - Get user lyrics
- `POST /api/lyrics-ai/lyrics` - Create new lyrics
- `PUT /api/lyrics-ai/lyrics/[id]` - Update lyrics
- `DELETE /api/lyrics-ai/lyrics/[id]` - Delete lyrics

## 🗄️ Database Schema

### Tables Created

1. **lyrics_assets**: Main content storage for all types
2. **lyrics**: Specialized table for lyrics with additional metadata
3. **user_api_keys**: Store user's API keys for AI services

### Key Features

- **Version Control**: Each content piece can have multiple versions
- **Content Types**: Support for script, lyrics, poetry, prose
- **Text Locking**: JSON storage for locked text sections
- **Metadata**: Flexible JSON storage for additional data
- **User Isolation**: All content is user-specific

## 🔒 Security

- **Row Level Security**: Users can only access their own content
- **API Key Storage**: User API keys are stored securely
- **Input Validation**: All inputs are validated and sanitized
- **Authentication**: All endpoints require valid authentication

## 🎨 UI Components

The system includes these React components:

- `AITextEditor`: AI-powered text generation interface
- `TextToSpeech`: Text-to-speech conversion interface
- `FileImport`: File upload and text extraction
- `InlineEditor`: Inline editing with text locking

## 🚨 Troubleshooting

### Common Issues

1. **API Key Errors**: Make sure users enter valid API keys
2. **Database Connection**: Verify database tables are created
3. **File Upload**: Check file size limits and supported formats
4. **Authentication**: Ensure user is logged in

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## 📈 Performance

- **Lazy Loading**: Content is loaded on demand
- **Caching**: API responses are cached where appropriate
- **Pagination**: Large content lists are paginated
- **Optimized Queries**: Database queries are optimized with indexes

## 🔄 Version Control

The system supports:
- Creating new versions of existing content
- Viewing version history
- Restoring previous versions
- Branching from any version

## 📱 Mobile Support

The interface is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🤝 Contributing

To add new features:

1. Update the database schema if needed
2. Add new API endpoints
3. Create React components
4. Update the main page
5. Add tests

## 📄 License

This feature is part of the Beatheos application and follows the same license terms.

