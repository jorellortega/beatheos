-- Fix storage bucket policies
-- Run this in your Supabase SQL editor

-- Enable RLS on the beats bucket if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'beats' AND 
  auth.role() = 'authenticated'
);

-- Create policy to allow users to view their own files
CREATE POLICY "Allow users to view their own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'beats' AND 
  auth.role() = 'authenticated'
);

-- Create policy to allow users to update their own files
CREATE POLICY "Allow users to update their own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'beats' AND 
  auth.role() = 'authenticated'
);

-- Create policy to allow users to delete their own files
CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'beats' AND 
  auth.role() = 'authenticated'
); 