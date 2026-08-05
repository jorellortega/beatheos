-- Update legacy OpenAI model defaults to GPT-5.6 family
UPDATE public.ai_settings
SET setting_value = 'gpt-5.6-luna',
    updated_at = timezone('utc'::text, now())
WHERE setting_key = 'openai_model'
  AND setting_value IN ('gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo');

UPDATE public.ai_settings
SET setting_value = 'gpt-image-2',
    updated_at = timezone('utc'::text, now())
WHERE setting_key IN ('images_selected_model', 'images_locked_model')
  AND setting_value IN ('gpt-image-1', 'gpt-4.1-mini');
