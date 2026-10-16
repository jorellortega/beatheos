-- Platform ElevenLabs key used by Create Song and album instrumental generation.
INSERT INTO public.ai_settings (setting_key, setting_value, description)
VALUES (
  'elevenlabs_api_key',
  '',
  'ElevenLabs API key for Create Song and album instrumentals. Music keys start with sk_.'
)
ON CONFLICT (setting_key) DO NOTHING;
