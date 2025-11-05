"use client"

/**
 * DEBUG LOGGING ENABLED FOR UPLOAD-BEAT PAGE
 * 
 * This file contains comprehensive debug logging to track upload issues.
 * All debug logs are prefixed with [DEBUG <function>] for easy filtering.
 * 
 * Debug Categories:
 * - Component Lifecycle: MockBeatUploadForm mount, user authentication
 * - File Drops: smartOnDrop, filesTabOnDrop - tracks all file operations
 * - Single Uploads: handleSubmit - tracks metadata, files, API calls
 * - Batch Uploads: handleBatchPublish - tracks multiple file uploads with status
 * - File Management: handleDeleteAudioFile, handleEditFile, handleSaveFileTitle
 * - File Selection: handleCheckboxChange - tracks selection state
 * - File Pairing: handlePair - tracks MP3+WAV+ZIP+Cover combinations
 * - Cover Art: Set as Cover button, handleApplyCoverToSelected
 * - Batch Editing: handleBatchEditAll, handleBatchSave, handleBatchCancel
 * - Licensing: useEffect licensing - tracks default license initialization
 * - Drafts: fetchDrafts - tracks draft loading
 * - Tab Changes: Tracks navigation between Upload/Drafts/Files tabs
 * 
 * To view logs in browser console, filter by: "[DEBUG"
 */

import type React from "react"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Upload, Music, ImageIcon, Loader, FileText, AudioLines, FileAudio, FileArchive, File, Play, Pause, CheckCircle, XCircle } from "lucide-react"
import { FileUploader } from "./FileUploader"
import { BeatPreviewPlayer } from "./BeatPreviewPlayer"
import { LicensingOptions } from "./LicensingOptions"
import { TagInput } from "./TagInput"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import { AudioFile, PairedFile, PlaylistAlbum } from "@/types/draft"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface InitialData {
  title: string
  description: string
  tags: string[]
  bpm: string
  key: string
  genre: string
  file: File | undefined
  wavFile: File | null
  stemsFile: File | null
  coverArt: File | null
  licensing: Record<string, number>
}

interface MockBeatUploadFormProps {
  initialData?: InitialData
}

interface Draft {
  id: string;
  title: string;
  mp3_url?: string;
  file_url?: string;
  [key: string]: any;
}

export function MockBeatUploadForm({ initialData }: MockBeatUploadFormProps) {
  console.log('[DEBUG MockBeatUploadForm] ========== COMPONENT MOUNTED ==========');
  console.log('[DEBUG MockBeatUploadForm] Initial data provided:', !!initialData);
  
  const { user } = useAuth();
  console.log('[DEBUG MockBeatUploadForm] User logged in:', !!user);
  if (user) {
    console.log('[DEBUG MockBeatUploadForm] User ID:', user.id);
  }
  
  const [activeTab, setActiveTab] = useState("upload")
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [bpm, setBpm] = useState(initialData?.bpm || "")
  const [key, setKey] = useState(initialData?.key || "")
  const [genre, setGenre] = useState(initialData?.genre || "")
  const [customGenre, setCustomGenre] = useState<string | null>(null)
  
  // File state with debugging wrappers
  const [mp3File, setMp3FileRaw] = useState<File | null>(null)
  const setMp3File = (file: File | null) => {
    console.log('[DEBUG setMp3File] Setting MP3 file:', file ? { name: file.name, size: file.size } : 'null');
    setMp3FileRaw(file);
  };
  
  const [wavFile, setWavFileRaw] = useState<File | null>(initialData?.wavFile || null)
  const setWavFile = (file: File | null) => {
    console.log('[DEBUG setWavFile] Setting WAV file:', file ? { name: file.name, size: file.size } : 'null');
    setWavFileRaw(file);
  };
  
  const [stemsFile, setStemsFileRaw] = useState<File | null>(initialData?.stemsFile || null)
  const setStemsFile = (file: File | null) => {
    console.log('[DEBUG setStemsFile] Setting Stems file:', file ? { name: file.name, size: file.size } : 'null');
    setStemsFileRaw(file);
  };
  
  const [coverArt, setCoverArtRaw] = useState<File | null>(initialData?.coverArt || null)
  const setCoverArt = (file: File | null) => {
    console.log('[DEBUG setCoverArt] Setting Cover Art:', file ? { name: file.name, size: file.size } : 'null');
    setCoverArtRaw(file);
  };
  const [licensing, setLicensing] = useState<Record<string, number>>(initialData?.licensing || {})
  const [isDraft, setIsDraft] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const router = useRouter()
  const [playingDraftId, setPlayingDraftId] = useState<string | null>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({})
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileTitle, setEditingFileTitle] = useState<string>("");
  const [batchEditingIds, setBatchEditingIds] = useState<string[]>([]);
  const [batchEditingTitles, setBatchEditingTitles] = useState<{ [id: string]: string }>({});
  const [pairedBeat, setPairedBeat] = useState<any | null>(null);
  const [publishStatus, setPublishStatus] = useState<{ [fileId: string]: 'pending' | 'success' | 'error' }>({});
  const [expandedLicensingId, setExpandedLicensingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDrafts() {
      console.log('[DEBUG useEffect fetchDrafts] Fetching drafts for user...');
      if (!user) {
        console.log('[DEBUG useEffect fetchDrafts] No user, skipping fetch');
        return;
      }
      console.log('[DEBUG useEffect fetchDrafts] User ID:', user.id);
      
      const { data, error } = await supabase
        .from('beats')
        .select('*')
        .eq('producer_id', user.id)
        .eq('is_draft', true);
      
      if (error) {
        console.error('[DEBUG useEffect fetchDrafts] Error fetching drafts:', error);
      } else {
        console.log('[DEBUG useEffect fetchDrafts] Drafts fetched:', data?.length || 0);
        if (data) setDrafts(data);
      }
    }
    fetchDrafts();
  }, [user]);

  // Smart assignment for global dropzone (Upload Beat tab)
  const smartOnDrop = useCallback((acceptedFiles: File[]) => {
    console.log('[DEBUG smartOnDrop] Files dropped:', acceptedFiles.length);
    acceptedFiles.forEach((file, idx) => {
      console.log(`[DEBUG smartOnDrop] File ${idx + 1}:`, {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });
    });

    const mp3s = acceptedFiles.filter(f => f.type === "audio/mpeg" || f.name.toLowerCase().endsWith('.mp3'));
    const wavs = acceptedFiles.filter(f => f.type === "audio/wav" || f.name.toLowerCase().endsWith('.wav'));
    const zips = acceptedFiles.filter(f => f.type === "application/zip" || f.name.toLowerCase().endsWith('.zip'));
    const images = acceptedFiles.filter(f => f.type.startsWith("image/") || [".png", ".jpg", ".jpeg", ".gif"].some(ext => f.name.toLowerCase().endsWith(ext)));
    
    console.log('[DEBUG smartOnDrop] File classification:', {
      mp3Count: mp3s.length,
      wavCount: wavs.length,
      zipCount: zips.length,
      imageCount: images.length
    });
    if (mp3s.length === 1 && wavs.length === 0 && zips.length === 0 && acceptedFiles.length === 1) {
      console.log('[DEBUG smartOnDrop] Case: Single MP3 only');
      console.log('[DEBUG smartOnDrop] Setting MP3, keeping existing WAV and Stems');
      setMp3File(mp3s[0]);
      // Don't clear other files - allow building up MP3 + WAV + Stems one at a time
    } else if (mp3s.length === 0 && wavs.length === 1 && zips.length === 0 && acceptedFiles.length === 1) {
      console.log('[DEBUG smartOnDrop] Case: Single WAV only');
      console.log('[DEBUG smartOnDrop] Setting WAV, keeping existing MP3 and Stems');
      setWavFile(wavs[0]);
      // Don't clear other files - allow building up MP3 + WAV + Stems one at a time
    } else if (mp3s.length === 0 && wavs.length === 0 && zips.length === 1 && acceptedFiles.length === 1) {
      console.log('[DEBUG smartOnDrop] Case: Single ZIP only');
      console.log('[DEBUG smartOnDrop] Setting Stems, keeping existing MP3 and WAV');
      setStemsFile(zips[0]);
      // Don't clear other files - allow building up MP3 + WAV + Stems one at a time
    } else if (mp3s.length === 1 && wavs.length === 1 && zips.length === 0 && acceptedFiles.length === 2) {
      console.log('[DEBUG smartOnDrop] Case: MP3 + WAV pair');
      setMp3File(mp3s[0]);
      setWavFile(wavs[0]);
      setStemsFile(null);
    } else if (mp3s.length === 1 && wavs.length === 0 && zips.length === 1 && acceptedFiles.length === 2) {
      console.log('[DEBUG smartOnDrop] Case: MP3 + ZIP pair');
      setMp3File(mp3s[0]);
      setWavFile(null);
      setStemsFile(zips[0]);
    } else if (mp3s.length === 0 && wavs.length === 1 && zips.length === 1 && acceptedFiles.length === 2) {
      console.log('[DEBUG smartOnDrop] Case: WAV + ZIP pair');
      setMp3File(null);
      setWavFile(wavs[0]);
      setStemsFile(zips[0]);
    } else if (mp3s.length === 1 && wavs.length === 1 && zips.length === 1 && acceptedFiles.length === 3) {
      console.log('[DEBUG smartOnDrop] Case: MP3 + WAV + ZIP complete set');
      setMp3File(mp3s[0]);
      setWavFile(wavs[0]);
      setStemsFile(zips[0]);
    } else if (images.length === 1 && acceptedFiles.length === 1) {
      console.log('[DEBUG smartOnDrop] Case: Single image for cover art');
      console.log('[DEBUG smartOnDrop] Setting cover art, keeping existing audio files');
      setCoverArt(images[0]);
    } else {
      console.log('[DEBUG smartOnDrop] Case: Multiple files -> Adding to Files tab');
      const newFiles = acceptedFiles.map(file => ({
        id: `af${prev => prev.length + Math.random()}`,
        title: file.name,
        file: file.type.startsWith('image/') ? file : (file.type.startsWith('audio/') ? file : null),
        wavFile: file.name.toLowerCase().endsWith('.wav') ? file : null,
        stemsFile: file.name.toLowerCase().endsWith('.zip') ? file : null,
        coverArt: file.type.startsWith('image/') ? file : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      console.log('[DEBUG smartOnDrop] New files to be added:', newFiles.length);
      setAudioFiles(prev => [
        ...prev,
        ...acceptedFiles.map(file => ({
          id: `af${prev.length + Math.random()}`,
          title: file.name,
          file: file.type.startsWith('image/') ? file : (file.type.startsWith('audio/') ? file : null),
          wavFile: file.name.toLowerCase().endsWith('.wav') ? file : null,
          stemsFile: file.name.toLowerCase().endsWith('.zip') ? file : null,
          coverArt: file.type.startsWith('image/') ? file : null,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      ]);
      if (acceptedFiles.length > 1) {
        console.log('[DEBUG smartOnDrop] Switching to audio tab (multiple files)');
        setActiveTab('audio');
      }
    }
  }, [setMp3File, setWavFile, setStemsFile, setCoverArt, setAudioFiles, setActiveTab]);

  // Update the filesTabOnDrop function to initialize licensing
  const filesTabOnDrop = useCallback((acceptedFiles: File[]) => {
    console.log('[DEBUG filesTabOnDrop] Files dropped in Files tab:', acceptedFiles.length);
    acceptedFiles.forEach((file, idx) => {
      console.log(`[DEBUG filesTabOnDrop] File ${idx + 1}:`, {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });
    });

    const defaultLicensing = {
      'template-lease': 20.00,
      'template-premium-lease': 100.00,
      'template-exclusive': 300.00,
      'template-buy-out': 1000.00
    };
    
    console.log('[DEBUG filesTabOnDrop] Applying default licensing to all files:', defaultLicensing);
    
    setAudioFiles(prev => {
      const newFiles = acceptedFiles.map(file => ({
        id: `af${prev.length + Math.random()}`,
        title: file.name,
        file: file.type.startsWith('image/') ? file : (file.type.startsWith('audio/') ? file : null),
        wavFile: file.name.toLowerCase().endsWith('.wav') ? file : null,
        stemsFile: file.name.toLowerCase().endsWith('.zip') ? file : null,
        coverArt: file.type.startsWith('image/') ? file : null,
        licensing: { ...defaultLicensing }, // Initialize with default licensing
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      console.log('[DEBUG filesTabOnDrop] New audio files created:', newFiles.length);
      return [...prev, ...newFiles];
    });
  }, [setAudioFiles]);

  const dropzoneConfig = {
    onDrop: smartOnDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'application/zip': ['.zip'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    }
  };
  const globalDropzone = useDropzone(dropzoneConfig);
  const filesTabDropzone = useDropzone({ ...dropzoneConfig, onDrop: filesTabOnDrop });

  const simulateUpload = async () => {
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i)
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[DEBUG handleSubmit] ========== FORM SUBMIT TRIGGERED ==========');
    console.log('[DEBUG handleSubmit] Event type:', e.type);
    console.log('[DEBUG handleSubmit] Event target:', e.target);
    console.log('[DEBUG handleSubmit] Current files state:', {
      mp3File: mp3File ? { name: mp3File.name, size: mp3File.size, type: mp3File.type } : null,
      wavFile: wavFile ? { name: wavFile.name, size: wavFile.size, type: wavFile.type } : null,
      stemsFile: stemsFile ? { name: stemsFile.name, size: stemsFile.size, type: stemsFile.type } : null,
      coverArt: coverArt ? { name: coverArt.name, size: coverArt.size, type: coverArt.type } : null
    });
    
    setIsUploading(true);
    console.log('[DEBUG handleSubmit] ========== SINGLE BEAT UPLOAD STARTED ==========');
    console.log('[DEBUG handleSubmit] Upload type: SINGLE');
    console.log('[DEBUG handleSubmit] Is Draft:', isDraft);

    if (!mp3File) {
      console.log('[DEBUG handleSubmit] Upload failed: No MP3 file selected');
      toast({
        title: "Missing Required File",
        description: "Please upload an MP3 file for your beat",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    try {
      if (!user) {
        console.log('[DEBUG handleSubmit] Upload failed: No user logged in');
        throw new Error('You must be logged in to upload beats');
      }

      console.log('[DEBUG handleSubmit] User ID:', user.id);

      // Get session for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[DEBUG handleSubmit] No session found');
        throw new Error('You must be logged in to upload beats');
      }

      console.log('[DEBUG handleSubmit] Session token obtained');

      // Prepare form data for API call
      console.log('[DEBUG handleSubmit] Preparing form data with metadata:');
      console.log('[DEBUG handleSubmit]   - Title:', title);
      console.log('[DEBUG handleSubmit]   - Description:', description);
      console.log('[DEBUG handleSubmit]   - Genre:', customGenre || genre);
      console.log('[DEBUG handleSubmit]   - BPM:', bpm);
      console.log('[DEBUG handleSubmit]   - Key:', key);
      console.log('[DEBUG handleSubmit]   - Tags:', tags);
      console.log('[DEBUG handleSubmit]   - Licensing:', licensing);
      console.log('[DEBUG handleSubmit]   - MP3 File:', mp3File.name, '(' + (mp3File.size / 1024 / 1024).toFixed(2) + ' MB)');
      console.log('[DEBUG handleSubmit]   - WAV File:', wavFile ? wavFile.name + ' (' + (wavFile.size / 1024 / 1024).toFixed(2) + ' MB)' : 'None');
      console.log('[DEBUG handleSubmit]   - Stems File:', stemsFile ? stemsFile.name + ' (' + (stemsFile.size / 1024 / 1024).toFixed(2) + ' MB)' : 'None');
      console.log('[DEBUG handleSubmit]   - Cover Art:', coverArt ? coverArt.name + ' (' + (coverArt.size / 1024).toFixed(2) + ' KB)' : 'None');

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('genre', customGenre || genre);
      formData.append('bpm', bpm);
      formData.append('key', key);
      formData.append('tags', JSON.stringify(tags));
      formData.append('licensing', JSON.stringify(licensing));
      formData.append('isDraft', isDraft.toString());
      
      console.log('[DEBUG handleSubmit] Adding files to FormData:');
      console.log('[DEBUG handleSubmit]   - MP3:', mp3File.name);
      formData.append('mp3File', mp3File);
      
      if (wavFile) {
        console.log('[DEBUG handleSubmit]   - WAV:', wavFile.name);
        formData.append('wavFile', wavFile);
      } else {
        console.log('[DEBUG handleSubmit]   - WAV: SKIPPED (wavFile is null or undefined)');
      }
      
      if (stemsFile) {
        console.log('[DEBUG handleSubmit]   - Stems:', stemsFile.name);
        formData.append('stemsFile', stemsFile);
      } else {
        console.log('[DEBUG handleSubmit]   - Stems: SKIPPED (stemsFile is null or undefined)');
      }
      
      if (coverArt) {
        console.log('[DEBUG handleSubmit]   - Cover Art:', coverArt.name);
        formData.append('coverArt', coverArt);
      } else {
        console.log('[DEBUG handleSubmit]   - Cover Art: SKIPPED (coverArt is null or undefined)');
      }
      
      console.log('[DEBUG handleSubmit] FormData prepared. Total entries:', Array.from(formData.entries()).length);

      console.log('[DEBUG handleSubmit] Calling /api/beats endpoint...');
      const response = await fetch('/api/beats', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      });

      console.log('[DEBUG handleSubmit] API Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('[DEBUG handleSubmit] API response error:', error);
        throw new Error(error.error || 'Failed to upload beat');
      }

      const beat = await response.json();
      console.log('[DEBUG handleSubmit] Beat uploaded successfully:', beat);
      console.log('[DEBUG handleSubmit] Beat ID:', beat.id);

      toast({
        title: isDraft ? "Draft Saved" : "Beat Uploaded",
        description: isDraft ? "Your beat draft has been saved successfully." : "Your beat has been successfully uploaded and is now live.",
      });
      console.log('[DEBUG handleSubmit] Upload process completed successfully');
      console.log('[DEBUG handleSubmit] ========== SINGLE BEAT UPLOAD FINISHED ==========');
      
      router.push('/dashboard/business_producer?tab=mybeats');
      // Reset form after submission
      setTitle("");
      setDescription("");
      setTags([]);
      setBpm("");
      setKey("");
      setGenre("");
      setCustomGenre(null);
      setMp3File(null);
      setWavFile(null);
      setStemsFile(null);
      setCoverArt(null);
      setLicensing({});
      setIsDraft(false);
    } catch (error) {
      console.error("[DEBUG handleSubmit] Error uploading beat:", error);
      console.error("[DEBUG handleSubmit] Error stack:", error instanceof Error ? error.stack : 'N/A');
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "An error occurred during the upload process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  const loadDraft = (draft: Draft) => {
    router.push(`/beatupload/${draft.id}`)
  }

  const deleteDraft = (draftId: string) => {
    setDrafts(drafts.filter(draft => draft.id !== draftId))
    toast({
      title: "Draft Deleted",
      description: "The draft has been deleted successfully.",
    })
  }

  const handleAudioFileUpload = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const newAudioFile: AudioFile = {
      id: `af${audioFiles.length + 1}`,
      title: `New Audio File ${audioFiles.length + 1}`,
      file: null,
      wavFile: null,
      stemsFile: null,
      coverArt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setAudioFiles([...audioFiles, newAudioFile])
    toast({
      title: "Audio file added",
      description: "Please edit the file details to complete the upload.",
    })
  }

  const handleEditAudioFile = (file: AudioFile) => {
    router.push(`/beatupload/${file.id}?type=audio`)
  }

  const handleDeleteAudioFile = (id: string) => {
    const fileToDelete = audioFiles.find(f => f.id === id);
    console.log('[DEBUG handleDeleteAudioFile] Deleting file:', {
      id,
      title: fileToDelete?.title,
      hasFile: !!fileToDelete?.file,
      hasWav: !!fileToDelete?.wavFile,
      hasStems: !!fileToDelete?.stemsFile,
      hasCover: !!fileToDelete?.coverArt
    });
    
    setAudioFiles(audioFiles.filter(file => file.id !== id))
    console.log('[DEBUG handleDeleteAudioFile] File deleted. Remaining files:', audioFiles.length - 1);
    
    toast({
      title: "Audio file deleted",
      description: "The audio file has been removed from your list.",
    })
  }

  const handleCheckboxChange = (fileId: string, checked: boolean) => {
    console.log(`[DEBUG handleCheckboxChange] File ${fileId} checkbox:`, checked ? 'CHECKED' : 'UNCHECKED');
    setSelectedFileIds(prev => {
      const newSelection = checked ? [...prev, fileId] : prev.filter(id => id !== fileId);
      console.log('[DEBUG handleCheckboxChange] Updated selection:', newSelection);
      return newSelection;
    });
  };

  const handlePlayPause = (draft: any) => {
    if (playingDraftId === draft.id) {
      audioRefs.current[draft.id]?.pause();
      setPlayingDraftId(null);
    } else {
      if (playingDraftId && audioRefs.current[playingDraftId]) {
        audioRefs.current[playingDraftId]?.pause();
        audioRefs.current[playingDraftId]!.currentTime = 0;
      }
      audioRefs.current[draft.id]?.play();
      setPlayingDraftId(draft.id);
    }
  };

  const handleEditDraft = (draft: Draft) => {
    setEditingDraft(draft)
    setIsEditDialogOpen(true)
  }

  const handleSaveDraft = async (updatedDraft: Draft) => {
    await supabase.from('beats').update(updatedDraft).eq('id', updatedDraft.id)
    setIsEditDialogOpen(false)
    setEditingDraft(null)
    // Refresh drafts
    if (user) {
      const { data } = await supabase
        .from('beats')
        .select('*')
        .eq('producer_id', user.id)
        .eq('is_draft', true)
      if (data) setDrafts(data)
    }
  }

  const handlePublishDraft = async (updatedDraft: Draft) => {
    await supabase.from('beats').update({ ...updatedDraft, is_draft: false }).eq('id', updatedDraft.id)
    setIsEditDialogOpen(false)
    setEditingDraft(null)
    // Refresh drafts
    if (user) {
      const { data } = await supabase
        .from('beats')
        .select('*')
        .eq('producer_id', user.id)
        .eq('is_draft', true)
      if (data) setDrafts(data)
    }
  }

  const handleEditFile = (file: AudioFile) => {
    console.log('[DEBUG handleEditFile] Editing file:', {
      id: file.id,
      currentTitle: file.title
    });
    setEditingFileId(file.id);
    setEditingFileTitle(file.title);
  };

  const handleSaveFileTitle = (fileId: string) => {
    const oldTitle = audioFiles.find(f => f.id === fileId)?.title;
    console.log('[DEBUG handleSaveFileTitle] Saving title for file:', {
      fileId,
      oldTitle,
      newTitle: editingFileTitle
    });
    
    setAudioFiles(prev => prev.map(f => f.id === fileId ? { ...f, title: editingFileTitle } : f));
    setEditingFileId(null);
    setEditingFileTitle("");
    
    console.log('[DEBUG handleSaveFileTitle] Title updated successfully');
    toast({ title: "Title Updated", description: "Beat name updated successfully." });
  };

  const handleCancelEdit = () => {
    setEditingFileId(null);
    setEditingFileTitle("");
  };

  // Batch edit handlers
  const handleBatchEditAll = () => {
    console.log('[DEBUG handleBatchEditAll] Starting batch edit for selected files:', selectedFileIds);
    const filesToEdit = audioFiles.filter(f => selectedFileIds.includes(f.id));
    console.log('[DEBUG handleBatchEditAll] Files to edit:', filesToEdit.map(f => ({
      id: f.id,
      title: f.title
    })));
    
    setBatchEditingIds(selectedFileIds);
    setBatchEditingTitles(
      Object.fromEntries(
        filesToEdit.map(f => [f.id, f.title])
      )
    );
    setSelectedFileIds([]);
    console.log('[DEBUG handleBatchEditAll] Batch edit mode activated');
  };

  const handleBatchEditTitleChange = (id: string, value: string) => {
    console.log(`[DEBUG handleBatchEditTitleChange] Updating title for ${id}:`, value);
    setBatchEditingTitles(prev => ({ ...prev, [id]: value }));
  };

  const handleBatchSave = (id: string) => {
    const oldTitle = audioFiles.find(f => f.id === id)?.title;
    const newTitle = batchEditingTitles[id];
    console.log('[DEBUG handleBatchSave] Saving batch edited title:', {
      fileId: id,
      oldTitle,
      newTitle
    });
    
    setAudioFiles(prev => prev.map(f => f.id === id ? { ...f, title: batchEditingTitles[id] } : f));
    setBatchEditingIds(prev => prev.filter(i => i !== id));
    setBatchEditingTitles(prev => { const t = { ...prev }; delete t[id]; return t; });
    console.log('[DEBUG handleBatchSave] Batch save completed for file:', id);
    toast({ title: "Title Updated", description: "Beat name updated successfully." });
  };

  const handleBatchCancel = (id: string) => {
    console.log('[DEBUG handleBatchCancel] Canceling batch edit for file:', id);
    setBatchEditingIds(prev => prev.filter(i => i !== id));
    setBatchEditingTitles(prev => { const t = { ...prev }; delete t[id]; return t; });
  };

  // Helper to get file type
  const getFileType = (file: AudioFile) => {
    if (file.file?.type === 'audio/mpeg' || file.title.toLowerCase().endsWith('.mp3')) return 'mp3';
    if (file.wavFile || file.title.toLowerCase().endsWith('.wav')) return 'wav';
    if (file.stemsFile || file.title.toLowerCase().endsWith('.zip')) return 'zip';
    if (file.coverArt || /\.(jpg|jpeg|png|gif)$/i.test(file.title)) return 'cover';
    return 'other';
  };

  // Validate selection for pairing
  const canPair = (() => {
    const types: Record<string, number> = {};
    for (const id of selectedFileIds) {
      const file = audioFiles.find(f => f.id === id);
      if (!file) continue;
      const type = getFileType(file);
      types[type] = (types[type] || 0) + 1;
      if (types[type] > 1) return false;
    }
    // Only allow if at least 2 files and all types are unique (no duplicates)
    return selectedFileIds.length > 1 && Object.values(types).every(v => v === 1);
  })();

  // Pair action
  const handlePair = () => {
    console.log('[DEBUG handlePair] ========== FILE PAIRING STARTED ==========');
    console.log('[DEBUG handlePair] Selected file IDs for pairing:', selectedFileIds);
    
    const files = selectedFileIds.map(id => audioFiles.find(f => f.id === id)).filter(Boolean);
    console.log('[DEBUG handlePair] Files to pair:', files.map(f => ({
      id: f?.id,
      title: f?.title,
      type: f ? getFileType(f) : 'unknown'
    })));
    
    const mp3 = files.find(f => getFileType(f!) === 'mp3');
    const wav = files.find(f => getFileType(f!) === 'wav');
    const zip = files.find(f => getFileType(f!) === 'zip');
    const cover = files.find(f => getFileType(f!) === 'cover');
    
    console.log('[DEBUG handlePair] Paired components:', {
      mp3: mp3?.title || 'None',
      wav: wav?.title || 'None',
      zip: zip?.title || 'None',
      cover: cover?.title || 'None'
    });
    
    const pairedBeatData = {
      id: `paired-${Date.now()}`,
      title: '',
      description: '',
      mp3File: mp3?.file,
      wavFile: wav?.wavFile,
      stemsFile: zip?.stemsFile,
      coverArt: cover?.coverArt,
    };
    
    console.log('[DEBUG handlePair] Created paired beat:', {
      id: pairedBeatData.id,
      hasMp3: !!pairedBeatData.mp3File,
      hasWav: !!pairedBeatData.wavFile,
      hasStems: !!pairedBeatData.stemsFile,
      hasCover: !!pairedBeatData.coverArt
    });
    
    setPairedBeat(pairedBeatData);
    
    // Remove paired files from loose files
    setAudioFiles(prev => prev.filter(f => !selectedFileIds.includes(f.id)));
    console.log('[DEBUG handlePair] Removed paired files from audio files list');
    setSelectedFileIds([]);
    console.log('[DEBUG handlePair] ========== FILE PAIRING FINISHED ==========');
  };

  // Helper to get coverArt debug info
  const coverArtDebug = coverArt ? (coverArt.name ? `${coverArt.name} (${coverArt.type})` : coverArt.type) : 'None';

  // Debug: show coverArt info above Files tab
  const CoverArtDebugDisplay = () => (
    <div className="mb-2 text-xs text-gray-400">
      <span className="font-bold">Current CoverArt:</span> {coverArtDebug}
    </div>
  );

  // Apply selected coverArt to selected files (not paired)
  const handleApplyCoverToSelected = () => {
    console.log('[DEBUG handleApplyCoverToSelected] ========== APPLY COVER TO SELECTED STARTED ==========');
    console.log('[DEBUG handleApplyCoverToSelected] Cover art:', coverArt ? {
      name: coverArt.name,
      type: coverArt.type,
      size: coverArt.size
    } : 'None');
    console.log('[DEBUG handleApplyCoverToSelected] Selected file IDs:', selectedFileIds);
    
    if (!coverArt || selectedFileIds.length === 0) {
      console.log('[DEBUG handleApplyCoverToSelected] Aborted:', !coverArt ? 'No cover art' : 'No files selected');
      return;
    }
    
    const filesBeforeUpdate = audioFiles.filter(f => selectedFileIds.includes(f.id));
    console.log('[DEBUG handleApplyCoverToSelected] Files to update:', filesBeforeUpdate.map(f => ({
      id: f.id,
      title: f.title,
      type: getFileType(f),
      hadCoverBefore: !!f.coverArt
    })));
    
    setAudioFiles(prev => prev.map(f => {
      if (selectedFileIds.includes(f.id) && getFileType(f) !== 'cover') {
        console.log(`[DEBUG handleApplyCoverToSelected] Applying cover to: ${f.title}`);
        return { ...f, coverArt };
      }
      return f;
    }));
    
    const countUpdated = filesBeforeUpdate.filter(f => getFileType(f) !== 'cover').length;
    console.log('[DEBUG handleApplyCoverToSelected] Cover applied to', countUpdated, 'file(s)');
    
    toast({ title: "Cover Applied", description: `Cover image applied to ${countUpdated} file(s).` });
    console.log('[DEBUG handleApplyCoverToSelected] ========== APPLY COVER TO SELECTED FINISHED ==========');
  };

  // Update the handleBatchPublish function to properly handle licensing
  const handleBatchPublish = async () => {
    console.log('[DEBUG handleBatchPublish] ========== BATCH UPLOAD STARTED ==========');
    console.log('[DEBUG handleBatchPublish] Upload type: BATCH/MULTIPLE');
    console.log('[DEBUG handleBatchPublish] Selected files count:', selectedFileIds.length);
    console.log('[DEBUG handleBatchPublish] Selected file IDs:', selectedFileIds);

    if (!user || selectedFileIds.length === 0) {
      console.log('[DEBUG handleBatchPublish] Batch upload aborted:', !user ? 'No user' : 'No files selected');
      return;
    }

    setIsUploading(true);
    setPublishStatus({});
    
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedFileIds.length; i++) {
      const fileId = selectedFileIds[i];
      console.log(`[DEBUG handleBatchPublish] ========== Processing file ${i + 1}/${selectedFileIds.length} ==========`);
      console.log(`[DEBUG handleBatchPublish] File ID: ${fileId}`);
      
      setPublishStatus(prev => ({ ...prev, [fileId]: 'pending' }));
      const fileObj = audioFiles.find(f => f.id === fileId);
      
      if (!fileObj) {
        console.log(`[DEBUG handleBatchPublish] File object not found for ID: ${fileId}`);
        continue;
      }
      
      if (!fileObj.file) {
        console.log(`[DEBUG handleBatchPublish] No file attached to file object: ${fileId}`);
        continue;
      }

      console.log(`[DEBUG handleBatchPublish] File object found:`, {
        title: fileObj.title,
        hasFile: !!fileObj.file,
        hasWav: !!fileObj.wavFile,
        hasStems: !!fileObj.stemsFile,
        hasCoverArt: !!fileObj.coverArt,
        licensing: fileObj.licensing
      });

      try {
        console.log(`[DEBUG handleBatchPublish] Preparing metadata for: ${fileObj.title}`);
        const formData = new FormData();
        formData.append('title', fileObj.title);
        formData.append('description', '');
        formData.append('genre', '');
        formData.append('bpm', '');
        formData.append('key', '');
        formData.append('tags', JSON.stringify([]));
        
        // Get licensing info from the file object
        const licensingInfo = fileObj.licensing || {};
        console.log(`[DEBUG handleBatchPublish] Licensing info for ${fileObj.title}:`, licensingInfo);
        formData.append('licensing', JSON.stringify(licensingInfo));
        formData.append('isDraft', 'false');
        formData.append('mp3File', fileObj.file);
        
        if (fileObj.coverArt) {
          console.log(`[DEBUG handleBatchPublish] Adding cover art: ${fileObj.coverArt.name}`);
          formData.append('coverArt', fileObj.coverArt);
        }
        if (fileObj.wavFile) {
          console.log(`[DEBUG handleBatchPublish] Adding WAV file: ${fileObj.wavFile.name}`);
          formData.append('wavFile', fileObj.wavFile);
        }
        if (fileObj.stemsFile) {
          console.log(`[DEBUG handleBatchPublish] Adding stems file: ${fileObj.stemsFile.name}`);
          formData.append('stemsFile', fileObj.stemsFile);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log(`[DEBUG handleBatchPublish] No session found for file: ${fileObj.title}`);
          throw new Error('You must be logged in to upload beats');
        }

        console.log(`[DEBUG handleBatchPublish] Uploading ${fileObj.title} to /api/beats...`);
        const response = await fetch('/api/beats', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          body: formData,
        });

        console.log(`[DEBUG handleBatchPublish] API Response status for ${fileObj.title}:`, response.status);

        if (!response.ok) {
          const error = await response.json();
          console.error(`[DEBUG handleBatchPublish] API error for ${fileObj.title}:`, error);
          setPublishStatus(prev => ({ ...prev, [fileId]: 'error' }));
          errorCount++;
          throw new Error(error.error || 'Failed to upload beat');
        }

        const beat = await response.json();
        console.log(`[DEBUG handleBatchPublish] Beat uploaded successfully:`, {
          id: beat.id,
          title: beat.title
        });
        
        setPublishStatus(prev => ({ ...prev, [fileId]: 'success' }));
        successCount++;
        toast({ title: 'Beat Uploaded', description: `${fileObj.title} uploaded successfully!` });
      } catch (error) {
        console.error(`[DEBUG handleBatchPublish] Error uploading ${fileObj.title}:`, error);
        console.error(`[DEBUG handleBatchPublish] Error stack:`, error instanceof Error ? error.stack : 'N/A');
        setPublishStatus(prev => ({ ...prev, [fileId]: 'error' }));
        errorCount++;
        toast({ 
          title: 'Upload Error', 
          description: error instanceof Error ? error.message : 'An error occurred during upload', 
          variant: 'destructive' 
        });
      }
    }
    
    console.log('[DEBUG handleBatchPublish] ========== BATCH UPLOAD FINISHED ==========');
    console.log('[DEBUG handleBatchPublish] Results:', {
      total: selectedFileIds.length,
      successful: successCount,
      failed: errorCount
    });

    setIsUploading(false);
    setSelectedFileIds([]);
    setTimeout(() => {
      setActiveTab('mybeats');
    }, 1200);
  };

  // Ensure every file always has all default license keys in its licensing object
  useEffect(() => {
    const defaultLicensing = {
      'template-lease': 20.00,
      'template-premium-lease': 100.00,
      'template-exclusive': 300.00,
      'template-buy-out': 1000.00
    };
    let changed = false;
    const filesToUpdate: string[] = [];
    
    const updatedFiles = audioFiles.map(file => {
      const newLicensing = { ...defaultLicensing, ...(file.licensing || {}) };
      // Only update if something is missing
      if (Object.keys(defaultLicensing).some(key => !(key in (file.licensing || {})))) {
        changed = true;
        filesToUpdate.push(file.title);
        return { ...file, licensing: newLicensing };
      }
      return file;
    });
    
    if (changed) {
      console.log('[DEBUG useEffect licensing] Initializing default licensing for files:', filesToUpdate);
      console.log('[DEBUG useEffect licensing] Default licensing values:', defaultLicensing);
      setAudioFiles(updatedFiles);
    }
  }, [audioFiles]);

  return (
    <Tabs value={activeTab} onValueChange={(tab) => {
      console.log('[DEBUG Tab Change] Switching to tab:', tab);
      setActiveTab(tab);
    }} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="upload">
          <Upload className="mr-2 h-4 w-4" />
          Upload Beat
        </TabsTrigger>
        <TabsTrigger value="drafts">
          <FileText className="mr-2 h-4 w-4" />
          Saved Drafts ({drafts.length})
        </TabsTrigger>
        <TabsTrigger value="audio">
          <AudioLines className="mr-2 h-4 w-4" />
          Files ({audioFiles.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="space-y-6">
        <form 
          onSubmit={handleSubmit} 
          onKeyDown={(e) => {
            // Prevent form submission on Enter key press
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              console.log('[DEBUG Form] Enter key pressed in input field - PREVENTED auto-submit');
              e.preventDefault();
            }
          }}
          className="space-y-6"
        >
          <div
            {...globalDropzone.getRootProps()}
            className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
              globalDropzone.isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:border-primary/50"
            }`}
          >
            <input {...globalDropzone.getInputProps()} />
            <div className="flex flex-col items-center justify-center space-y-4">
              <Upload className="h-12 w-12 text-gray-400" />
              {globalDropzone.isDragActive ? (
                <p className="text-lg font-medium">Drop your files here...</p>
              ) : (
                <>
                  <p className="text-lg font-medium">Drag & drop your files here</p>
                  <p className="text-sm text-gray-400">or click to select files</p>
                  <p className="text-xs text-gray-500">
                    Supported formats: MP3, WAV, ZIP (stems), Images
                  </p>
                </>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title (Required)</Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={60}
              className="bg-secondary text-white"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary text-white"
              rows={4}
              maxLength={250}
            />
          </div>

          <TagInput tags={tags} setTags={setTags} />

          <div>
            <Label htmlFor="genre">Genre</Label>
            <select
              id="genre"
              name="genre"
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-secondary text-white"
            >
              <option value="">Select a genre</option>
              <option value="Trap">Trap</option>
              <option value="Hip Hop">Hip Hop</option>
              <option value="R&B">R&B</option>
              <option value="Pop">Pop</option>
              <option value="Rock">Rock</option>
              <option value="Electronic">Electronic</option>
              <option value="Jazz">Jazz</option>
              <option value="Classical">Classical</option>
              <option value="Other">Other (type below)</option>
            </select>
            {genre === 'Other' && (
              <Input
                type="text"
                name="customGenre"
                value={customGenre || ''}
                onChange={e => setCustomGenre(e.target.value)}
                placeholder="Enter custom genre"
                className="mt-2 bg-secondary text-white"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bpm">BPM</Label>
              <Input
                id="bpm"
                type="number"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                className="bg-secondary text-white"
              />
            </div>
            <div>
              <Label htmlFor="key">Key</Label>
              <Select onValueChange={setKey}>
                <SelectTrigger id="key" className="bg-secondary text-white">
                  <SelectValue placeholder="Select key" />
                </SelectTrigger>
                <SelectContent>
                  {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map((note) => (
                    <SelectItem key={note} value={note}>
                      {note} Major
                    </SelectItem>
                  ))}
                  {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map((note) => (
                    <SelectItem key={`${note}m`} value={`${note}m`}>
                      {note} Minor
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <FileUploader
            label="MP3 File (Required)"
            accept="audio/mpeg"
            file={mp3File}
            onFileChange={setMp3File}
            icon={<Music className="mr-2 h-4 w-4" />}
          />

          <FileUploader
            label="WAV File (Optional)"
            accept="audio/wav"
            file={wavFile}
            onFileChange={setWavFile}
            icon={<Music className="mr-2 h-4 w-4" />}
          />

          <FileUploader
            label="Track Stems (Optional)"
            accept="application/zip"
            file={stemsFile}
            onFileChange={setStemsFile}
            icon={<Music className="mr-2 h-4 w-4" />}
          />

          <FileUploader
            label="Cover Art (Optional)"
            accept="image/*"
            file={coverArt}
            onFileChange={setCoverArt}
            icon={<ImageIcon className="mr-2 h-4 w-4" />}
          />

          {mp3File && <BeatPreviewPlayer file={mp3File} />}

          <LicensingOptions licensing={licensing} setLicensing={setLicensing} />

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                console.log('[DEBUG Draft Toggle] Draft mode toggled:', !isDraft);
                setIsDraft(!isDraft);
              }}
              className="ml-4"
            >
              {isDraft ? "Unmark as Draft" : "Save as Draft"}
            </Button>
          </div>

          <Button
            type="submit"
            disabled={isUploading}
            onClick={() => {
              console.log('[DEBUG Submit Button] Upload button clicked');
            }}
            className="w-full gradient-button text-black font-medium hover:text-white"
          >
            {isUploading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                {uploadProgress < 100 ? `Uploading... ${Math.round(uploadProgress)}%` : "Processing..."}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {isDraft ? "Save Draft" : "Publish Beat"}
              </>
            )}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="drafts">
        <div className="space-y-1">
          {drafts.length === 0 ? (
            <p className="text-center text-gray-400">No saved drafts yet.</p>
          ) : (
            drafts.map((draft) => (
              <div key={draft.id} className="border rounded-lg p-2 hover:bg-secondary/50 transition-colors flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePlayPause(draft)}
                  >
                    {playingDraftId === draft.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <audio
                    ref={el => { audioRefs.current[draft.id] = el || null; }}
                    src={draft.mp3_url || draft.file_url || ''}
                    onEnded={() => setPlayingDraftId(null)}
                  />
                  <h3 className="font-medium truncate">{draft.title}</h3>
                </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                    onClick={() => handleEditDraft(draft)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-destructive hover:text-destructive"
                      onClick={() => deleteDraft(draft.id)}
                    >
                      Delete
                    </Button>
                </div>
              </div>
            ))
          )}
        </div>
        {editingDraft && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Draft</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSaveDraft(editingDraft)
                }}
                className="space-y-4"
              >
                <Input
                  value={editingDraft.title}
                  onChange={e => setEditingDraft({ ...editingDraft, title: e.target.value })}
                  placeholder="Title"
                  className="bg-secondary text-white"
                  required
                />
                <Textarea
                  value={editingDraft.description || ''}
                  onChange={e => setEditingDraft({ ...editingDraft, description: e.target.value })}
                  placeholder="Description"
                  className="bg-secondary text-white"
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Save Draft</Button>
                  <Button
                    type="button"
                    className="flex-1 bg-primary text-black"
                    onClick={() => handlePublishDraft(editingDraft)}
                  >
                    Publish
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </TabsContent>

      <TabsContent value="audio">
        <CoverArtDebugDisplay />
        <div
          {...filesTabDropzone.getRootProps()}
          className={`mb-4 p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${filesTabDropzone.isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:border-primary/50"}`}
        >
          <input {...filesTabDropzone.getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-8 w-8 text-gray-400" />
            {filesTabDropzone.isDragActive ? (
              <span className="text-base font-medium">Drop files to add</span>
            ) : (
              <>
                <span className="text-base font-medium">Drag & drop files here or click to upload</span>
                <span className="text-xs text-gray-500">Supported: MP3, WAV, ZIP, Images</span>
              </>
            )}
          </div>
        </div>
        {audioFiles.length > 0 && (
          <div className="flex gap-2 mb-2">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                if (selectedFileIds.length < audioFiles.length) {
                  setSelectedFileIds(audioFiles.map(f => f.id));
                } else {
                  setSelectedFileIds([]);
                }
              }}
              variant="secondary"
            >
              {selectedFileIds.length < audioFiles.length ? 'Select All' : 'Deselect All'}
            </Button>
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFileIds([]);
              }} 
              variant="secondary"
            >
              Deselect All
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleBatchEditAll();
              }}
              variant="outline"
            >
              Edit All
            </Button>
            <Button
              onClick={e => { e.stopPropagation(); handleApplyCoverToSelected(); }}
              variant="outline"
              disabled={(!coverArt || !coverArt.type) || selectedFileIds.length === 0}
            >
              Apply Cover to Selected
            </Button>
            <Button
              onClick={e => { e.stopPropagation(); handlePair(); }}
              variant="outline"
              disabled={!canPair}
            >
              Pair
            </Button>
            <Button
              onClick={e => { e.stopPropagation(); handleBatchPublish(); }}
              variant="outline"
              disabled={isUploading || selectedFileIds.length === 0}
            >
              {isUploading ? 'Publishing...' : 'Publish'}
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                toast({ title: "Save Draft", description: `Saving ${selectedFileIds.length} files as draft (stub)`, });
                setSelectedFileIds([]);
              }}
              variant="outline"
            >
              Save Draft
            </Button>
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFileIds([]);
              }} 
              variant="destructive"
            >
              Delete Selected
            </Button>
          </div>
        )}
        {pairedBeat && (
          <div className="mb-4 p-4 border border-yellow-400 rounded-lg bg-yellow-50">
            <h3 className="font-bold mb-2 text-yellow-900">Paired Beat</h3>
            <div className="mb-2">
              <Input
                placeholder="Title"
                value={pairedBeat.title}
                onChange={e => setPairedBeat({ ...pairedBeat, title: e.target.value })}
                className="mb-2"
              />
              <Textarea
                placeholder="Description"
                value={pairedBeat.description}
                onChange={e => setPairedBeat({ ...pairedBeat, description: e.target.value })}
                className="mb-2"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  // Save as draft logic (stub)
                  toast({ title: "Draft Saved", description: "Paired beat saved as draft." });
                  setPairedBeat(null);
                }}
                variant="outline"
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => {
                  // Publish logic (stub)
                  toast({ title: "Published", description: "Paired beat published." });
                  setPairedBeat(null);
                }}
                className="bg-yellow-400 text-black hover:bg-yellow-500"
              >
                Publish
              </Button>
              <Button
                onClick={() => setPairedBeat(null)}
                variant="destructive"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {audioFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-black rounded-lg hover:bg-yellow-400/20 cursor-pointer"
              onClick={() => handleCheckboxChange(file.id, !selectedFileIds.includes(file.id))}
            >
              <div className="w-6 flex-shrink-0 flex items-center justify-center mr-2">
                {publishStatus[file.id] === 'success' && <CheckCircle className="text-green-500 w-5 h-5" />}
                {publishStatus[file.id] === 'error' && <XCircle className="text-red-500 w-5 h-5" />}
                {publishStatus[file.id] === 'pending' && <Loader className="text-yellow-400 w-5 h-5 animate-spin" />}
              </div>
              <div className="flex items-center space-x-4">
                <Checkbox
                  checked={selectedFileIds.includes(file.id)}
                  onCheckedChange={checked => handleCheckboxChange(file.id, checked as boolean)}
                  onClick={e => e.stopPropagation()}
                />
                <div className="w-10 h-10 flex items-center justify-center bg-secondary/20 rounded">
                  {file.wavFile ? (
                    <FileAudio className="w-5 h-5 text-blue-400" />
                  ) : file.file?.type === 'audio/mpeg' ? (
                    <Music className="w-5 h-5 text-purple-400" />
                  ) : file.coverArt ? (
                    <ImageIcon className="w-5 h-5 text-green-400" />
                  ) : file.stemsFile ? (
                    <FileArchive className="w-5 h-5 text-yellow-400" />
                  ) : file.file?.type === 'application/pdf' ? (
                    <FileText className="w-5 h-5 text-red-400" />
                  ) : (
                    <File className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="space-y-1">
                  {batchEditingIds.includes(file.id) ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={batchEditingTitles[file.id] || ''}
                        onChange={e => handleBatchEditTitleChange(file.id, e.target.value)}
                        className="bg-secondary text-white h-8 px-2"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        onFocus={e => e.stopPropagation()}
                      />
                      <Button size="sm" className="h-8 px-3" onClick={e => { e.stopPropagation(); handleBatchSave(file.id); }}>
                        Save
                      </Button>
                      <Button size="sm" className="h-8 px-3" variant="outline" onClick={e => { e.stopPropagation(); handleBatchCancel(file.id); }}>
                        Cancel
                      </Button>
                    </div>
                  ) : editingFileId === file.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingFileTitle}
                        onChange={e => setEditingFileTitle(e.target.value)}
                        className="bg-secondary text-white h-8 px-2"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        onFocus={e => e.stopPropagation()}
                      />
                      <Button size="sm" className="h-8 px-3" onClick={e => { e.stopPropagation(); handleSaveFileTitle(file.id); }}>
                        Save
                      </Button>
                      <Button size="sm" className="h-8 px-3" variant="outline" onClick={e => { e.stopPropagation(); handleCancelEdit(); }}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <p className="font-medium text-white">{file.title}</p>
                  )}
                  <div className="flex items-center space-x-3 text-sm">
                    {file.wavFile && (
                      <span className="flex items-center px-2 py-1 bg-blue-500/20 rounded">
                        <FileAudio className="w-4 h-4 mr-1 text-blue-400" />
                        <span className="text-blue-300">WAV</span>
                      </span>
                    )}
                    {file.file?.type === 'audio/mpeg' && (
                      <span className="flex items-center px-2 py-1 bg-purple-500/20 rounded">
                        <Music className="w-4 h-4 mr-1 text-purple-400" />
                        <span className="text-purple-300">MP3</span>
                      </span>
                    )}
                    {file.coverArt && (
                      <span className="flex items-center px-2 py-1 bg-green-500/20 rounded">
                        <ImageIcon className="w-4 h-4 mr-1 text-green-400" />
                        <span className="text-green-300">JPEG</span>
                      </span>
                    )}
                    {file.stemsFile && (
                      <span className="flex items-center px-2 py-1 bg-yellow-500/20 rounded">
                        <FileArchive className="w-4 h-4 mr-1 text-yellow-400" />
                        <span className="text-yellow-300">ZIP</span>
                      </span>
                    )}
                    {file.file?.type === 'application/pdf' && (
                      <span className="flex items-center px-2 py-1 bg-red-500/20 rounded">
                        <FileText className="w-4 h-4 mr-1 text-red-400" />
                        <span className="text-red-300">PDF</span>
                      </span>
                    )}
                  </div>
                  {(
                    file.file?.type === 'audio/mpeg' ||
                    file.wavFile ||
                    file.stemsFile
                  ) && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="mb-2"
                        onClick={e => {
                          e.stopPropagation();
                          setExpandedLicensingId(expandedLicensingId === file.id ? null : file.id);
                        }}
                      >
                        {expandedLicensingId === file.id ? 'Hide Licensing' : 'Set Licensing'}
                      </Button>
                      {expandedLicensingId === file.id && (
                        <LicensingOptions
                          licensing={file.licensing || {}}
                          setLicensing={newLicensing =>
                            setAudioFiles(prev =>
                              prev.map(f => f.id === file.id ? { ...f, licensing: newLicensing } : f)
                            )
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {file.file && file.file.type.startsWith('image/') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-green-400 border-green-400 hover:bg-green-100 hover:text-black"
                    onClick={e => {
                      e.stopPropagation();
                      console.log('[DEBUG Set as Cover] ========== SET AS COVER CLICKED ==========');
                      console.log('[DEBUG Set as Cover] File:', {
                        id: file.id,
                        title: file.title,
                        name: file.file?.name,
                        type: file.file?.type,
                        size: file.file?.size
                      });
                      if (file.file) {
                        setCoverArt(file.file);
                        console.log('[DEBUG Set as Cover] Cover art set successfully');
                        toast({ title: 'Cover Selected', description: `${file.title} set as cover.` });
                      } else {
                        console.log('[DEBUG Set as Cover] ERROR: No file object found');
                      }
                      console.log('[DEBUG Set as Cover] ========== SET AS COVER FINISHED ==========');
                    }}
                  >
                    Set as Cover
                  </Button>
                )}
                {editingFileId === file.id ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-gray-300 hover:text-white hover:bg-secondary/80"
                    onClick={e => {
                      e.stopPropagation();
                      handleEditFile(file);
                    }}
                  >
                    Edit
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-red-400 hover:text-red-300 hover:bg-secondary/80"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteAudioFile(file.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  )
}

function AddSampleDialog() {
  const [name, setName] = useState("")
  const [source, setSource] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const event = new CustomEvent("add-sample", { detail: { name, source } })
    window.dispatchEvent(event)
    const dialog = document.getElementById('add-sample-dialog') as HTMLDialogElement
    dialog?.close()
    setName("")
    setSource("")
  }

  return (
    <dialog id="add-sample-dialog" className="rounded-lg p-6 max-w-md w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold">Add Sample</h3>
        <div>
          <Label htmlFor="sample-name">Sample Name</Label>
          <Input
            id="sample-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-secondary text-white"
          />
        </div>
        <div>
          <Label htmlFor="sample-source">Source</Label>
          <Input
            id="sample-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
            className="bg-secondary text-white"
            placeholder="e.g., Splice, Loopmasters, etc."
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const dialog = document.getElementById('add-sample-dialog') as HTMLDialogElement
              dialog?.close()
            }}
          >
            Cancel
          </Button>
          <Button type="submit">Add Sample</Button>
        </div>
      </form>
    </dialog>
  )
}

