"use client"

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("upload")
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [bpm, setBpm] = useState(initialData?.bpm || "")
  const [key, setKey] = useState(initialData?.key || "")
  const [genre, setGenre] = useState(initialData?.genre || "")
  const [customGenre, setCustomGenre] = useState<string | null>(null)
  const [mp3File, setMp3File] = useState<File | null>(null)
  const [wavFile, setWavFile] = useState<File | null>(initialData?.wavFile || null)
  const [stemsFile, setStemsFile] = useState<File | null>(initialData?.stemsFile || null)
  const [coverArt, setCoverArt] = useState<File | null>(initialData?.coverArt || null)
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
      if (!user) return;
      const { data, error } = await supabase
        .from('beats')
        .select('*')
        .eq('producer_id', user.id)
        .eq('is_draft', true);
      if (data) setDrafts(data);
    }
    fetchDrafts();
  }, [user]);

  // Smart assignment for global dropzone (Upload Beat tab)
  const smartOnDrop = useCallback((acceptedFiles: File[]) => {
    const mp3s = acceptedFiles.filter(f => f.type === "audio/mpeg" || f.name.toLowerCase().endsWith('.mp3'));
    const wavs = acceptedFiles.filter(f => f.type === "audio/wav" || f.name.toLowerCase().endsWith('.wav'));
    const zips = acceptedFiles.filter(f => f.type === "application/zip" || f.name.toLowerCase().endsWith('.zip'));
    const images = acceptedFiles.filter(f => f.type.startsWith("image/") || [".png", ".jpg", ".jpeg", ".gif"].some(ext => f.name.toLowerCase().endsWith(ext)));
    if (mp3s.length === 1 && wavs.length === 0 && zips.length === 0 && acceptedFiles.length === 1) {
      setMp3File(mp3s[0]);
      setWavFile(null);
      setStemsFile(null);
    } else if (mp3s.length === 0 && wavs.length === 1 && zips.length === 0 && acceptedFiles.length === 1) {
      setMp3File(null);
      setWavFile(wavs[0]);
      setStemsFile(null);
    } else if (mp3s.length === 0 && wavs.length === 0 && zips.length === 1 && acceptedFiles.length === 1) {
      setMp3File(null);
      setWavFile(null);
      setStemsFile(zips[0]);
    } else if (mp3s.length === 1 && wavs.length === 1 && zips.length === 0 && acceptedFiles.length === 2) {
      setMp3File(mp3s[0]);
      setWavFile(wavs[0]);
      setStemsFile(null);
    } else if (mp3s.length === 1 && wavs.length === 0 && zips.length === 1 && acceptedFiles.length === 2) {
      setMp3File(mp3s[0]);
      setWavFile(null);
      setStemsFile(zips[0]);
    } else if (mp3s.length === 0 && wavs.length === 1 && zips.length === 1 && acceptedFiles.length === 2) {
      setMp3File(null);
      setWavFile(wavs[0]);
      setStemsFile(zips[0]);
    } else if (mp3s.length === 1 && wavs.length === 1 && zips.length === 1 && acceptedFiles.length === 3) {
      setMp3File(mp3s[0]);
      setWavFile(wavs[0]);
      setStemsFile(zips[0]);
    } else if (images.length === 1 && acceptedFiles.length === 1) {
      setCoverArt(images[0]);
    } else {
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
      if (acceptedFiles.length > 1) setActiveTab('audio');
    }
  }, [setMp3File, setWavFile, setStemsFile, setCoverArt, setAudioFiles, setActiveTab]);

  // Update the filesTabOnDrop function to initialize licensing
  const filesTabOnDrop = useCallback((acceptedFiles: File[]) => {
    const defaultLicensing = {
      'template-lease': 20.00,
      'template-premium-lease': 100.00,
      'template-exclusive': 300.00,
      'template-buy-out': 1000.00
    };
    setAudioFiles(prev => [
      ...prev,
      ...acceptedFiles.map(file => ({
        id: `af${prev.length + Math.random()}`,
        title: file.name,
        file: file.type.startsWith('image/') ? file : (file.type.startsWith('audio/') ? file : null),
        wavFile: file.name.toLowerCase().endsWith('.wav') ? file : null,
        stemsFile: file.name.toLowerCase().endsWith('.zip') ? file : null,
        coverArt: file.type.startsWith('image/') ? file : null,
        licensing: { ...defaultLicensing }, // Initialize with default licensing
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    ]);
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
    setIsUploading(true);

    if (!mp3File) {
      toast({
        title: "Missing Required File",
        description: "Please upload an MP3 file for your beat",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    try {
      if (!user) throw new Error('You must be logged in to upload beats');
      const userId = user.id;
      const cleanTitle = title.trim().replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
      const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

      // MP3 upload
      const mp3FileName = sanitizeFileName(mp3File.name);
      const mp3Path = `profiles/${userId}/${cleanTitle}/${mp3FileName}`;
      const { data: mp3Upload, error: mp3Error } = await supabase.storage.from('beats').upload(mp3Path, mp3File, { upsert: true });
      if (mp3Error) throw new Error('MP3 upload failed: ' + (mp3Error.message || JSON.stringify(mp3Error)));
      const { data: { publicUrl: mp3Url } } = supabase.storage.from('beats').getPublicUrl(mp3Path);

      // WAV upload
      let wavUrl = null;
      if (wavFile) {
        const wavFileName = sanitizeFileName(wavFile.name);
        const wavPath = `profiles/${userId}/${cleanTitle}/${wavFileName}`;
        const { data: wavUpload, error: wavError } = await supabase.storage.from('beats').upload(wavPath, wavFile, { upsert: true });
        if (wavError) throw new Error('WAV upload failed: ' + (wavError.message || JSON.stringify(wavError)));
        const { data: { publicUrl: wUrl } } = supabase.storage.from('beats').getPublicUrl(wavPath);
        wavUrl = wUrl;
      }
      // Stems upload
      let stemsUrl = null;
      if (stemsFile) {
        const stemsFileName = sanitizeFileName(stemsFile.name);
        const stemsPath = `profiles/${userId}/${cleanTitle}/stems/${stemsFileName}`;
        const { data: stemsUpload, error: stemsError } = await supabase.storage.from('beats').upload(stemsPath, stemsFile, { upsert: true });
        if (stemsError) throw new Error('Stems upload failed: ' + (stemsError.message || JSON.stringify(stemsError)));
        const { data: { publicUrl: sUrl } } = supabase.storage.from('beats').getPublicUrl(stemsPath);
        stemsUrl = sUrl;
      }
      // Cover art upload
      let coverArtUrl = null;
      if (coverArt) {
        const coverFileName = sanitizeFileName(coverArt.name);
        const coverPath = `profiles/${userId}/${cleanTitle}/cover/${coverFileName}`;
        const { data: coverUpload, error: coverError } = await supabase.storage.from('beats').upload(coverPath, coverArt, { upsert: true });
        if (coverError) throw new Error('Cover art upload failed: ' + (coverError.message || JSON.stringify(coverError)));
        const { data: { publicUrl: cUrl } } = supabase.storage.from('beats').getPublicUrl(coverPath);
        coverArtUrl = cUrl;
      }
      // Insert beat metadata into database
      const { data: beat, error: dbError } = await supabase.from('beats').insert({
        producer_id: userId,
        title,
        description,
        genre,
        bpm,
        key,
        tags,
        licensing,
        mp3_url: mp3Url,
        wav_url: wavUrl,
        stems_url: stemsUrl,
        cover_art_url: coverArtUrl,
        is_draft: isDraft,
      }).select().single();
      if (dbError) throw dbError;
      toast({
        title: isDraft ? "Draft Saved" : "Beat Uploaded",
        description: isDraft ? "Your beat draft has been saved successfully." : "Your beat has been successfully uploaded and is now live.",
      });
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
      console.error("Error uploading beat:", error);
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
    setAudioFiles(audioFiles.filter(file => file.id !== id))
    toast({
      title: "Audio file deleted",
      description: "The audio file has been removed from your list.",
    })
  }

  const handleCheckboxChange = (fileId: string, checked: boolean) => {
    setSelectedFileIds(prev =>
      checked ? [...prev, fileId] : prev.filter(id => id !== fileId)
    );
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
    setEditingFileId(file.id);
    setEditingFileTitle(file.title);
  };

  const handleSaveFileTitle = (fileId: string) => {
    setAudioFiles(prev => prev.map(f => f.id === fileId ? { ...f, title: editingFileTitle } : f));
    setEditingFileId(null);
    setEditingFileTitle("");
    toast({ title: "Title Updated", description: "Beat name updated successfully." });
  };

  const handleCancelEdit = () => {
    setEditingFileId(null);
    setEditingFileTitle("");
  };

  // Batch edit handlers
  const handleBatchEditAll = () => {
    setBatchEditingIds(selectedFileIds);
    setBatchEditingTitles(
      Object.fromEntries(
        audioFiles.filter(f => selectedFileIds.includes(f.id)).map(f => [f.id, f.title])
      )
    );
    setSelectedFileIds([]);
  };

  const handleBatchEditTitleChange = (id: string, value: string) => {
    setBatchEditingTitles(prev => ({ ...prev, [id]: value }));
  };

  const handleBatchSave = (id: string) => {
    setAudioFiles(prev => prev.map(f => f.id === id ? { ...f, title: batchEditingTitles[id] } : f));
    setBatchEditingIds(prev => prev.filter(i => i !== id));
    setBatchEditingTitles(prev => { const t = { ...prev }; delete t[id]; return t; });
    toast({ title: "Title Updated", description: "Beat name updated successfully." });
  };

  const handleBatchCancel = (id: string) => {
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
    const files = selectedFileIds.map(id => audioFiles.find(f => f.id === id)).filter(Boolean);
    const mp3 = files.find(f => getFileType(f!) === 'mp3');
    const wav = files.find(f => getFileType(f!) === 'wav');
    const zip = files.find(f => getFileType(f!) === 'zip');
    const cover = files.find(f => getFileType(f!) === 'cover');
    setPairedBeat({
      id: `paired-${Date.now()}`,
      title: '',
      description: '',
      mp3File: mp3?.file,
      wavFile: wav?.wavFile,
      stemsFile: zip?.stemsFile,
      coverArt: cover?.coverArt,
    });
    // Remove paired files from loose files
    setAudioFiles(prev => prev.filter(f => !selectedFileIds.includes(f.id)));
    setSelectedFileIds([]);
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
    if (!coverArt || selectedFileIds.length === 0) return;
    setAudioFiles(prev => prev.map(f =>
      selectedFileIds.includes(f.id) && getFileType(f) !== 'cover'
        ? { ...f, coverArt }
        : f
    ));
    toast({ title: "Cover Applied", description: `Cover image applied to ${selectedFileIds.length} file(s).` });
    toast({ title: "DEBUG", description: `handleApplyCoverToSelected fired. coverArt: ${coverArtDebug}, selected: ${selectedFileIds.length}` });
  };

  // Update the handleBatchPublish function to properly handle licensing
  const handleBatchPublish = async () => {
    if (!user || selectedFileIds.length === 0) return;
    setIsUploading(true);
    setPublishStatus({});
    for (const fileId of selectedFileIds) {
      setPublishStatus(prev => ({ ...prev, [fileId]: 'pending' }));
      const fileObj = audioFiles.find(f => f.id === fileId);
      if (!fileObj || !fileObj.file) continue;
      try {
        const formData = new FormData();
        formData.append('title', fileObj.title);
        formData.append('description', '');
        formData.append('genre', '');
        formData.append('bpm', '');
        formData.append('key', '');
        formData.append('tags', JSON.stringify([]));
        // Get licensing info from the file object
        const licensingInfo = fileObj.licensing || {};
        formData.append('licensing', JSON.stringify(licensingInfo));
        formData.append('isDraft', 'false');
        formData.append('mp3File', fileObj.file);
        if (fileObj.coverArt) formData.append('coverArt', fileObj.coverArt);
        if (fileObj.wavFile) formData.append('wavFile', fileObj.wavFile);
        if (fileObj.stemsFile) formData.append('stemsFile', fileObj.stemsFile);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('You must be logged in to upload beats');

        const response = await fetch('/api/beats', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          setPublishStatus(prev => ({ ...prev, [fileId]: 'error' }));
          throw new Error(error.error || 'Failed to upload beat');
        }

        setPublishStatus(prev => ({ ...prev, [fileId]: 'success' }));
        toast({ title: 'Beat Uploaded', description: `${fileObj.title} uploaded successfully!` });
      } catch (error) {
        console.error('Error uploading beat:', error);
        setPublishStatus(prev => ({ ...prev, [fileId]: 'error' }));
        toast({ 
          title: 'Upload Error', 
          description: error instanceof Error ? error.message : 'An error occurred during upload', 
          variant: 'destructive' 
        });
      }
    }
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
    const updatedFiles = audioFiles.map(file => {
      const newLicensing = { ...defaultLicensing, ...(file.licensing || {}) };
      // Only update if something is missing
      if (Object.keys(defaultLicensing).some(key => !(key in (file.licensing || {})))) {
        changed = true;
        return { ...file, licensing: newLicensing };
      }
      return file;
    });
    if (changed) setAudioFiles(updatedFiles);
  }, [audioFiles]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
        <form onSubmit={handleSubmit} className="space-y-6">
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
              variant="outline"
              onClick={() => setIsDraft(!isDraft)}
              className="ml-4"
            >
              {isDraft ? "Unmark as Draft" : "Save as Draft"}
            </Button>
          </div>

          <Button
            type="submit"
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
                      if (file.file) {
                        setCoverArt(file.file);
                        toast({ title: 'DEBUG', description: `Set as Cover: ${file.file.name} (${file.file.type})` });
                        toast({ title: 'Cover Selected', description: `${file.title} set as cover.` });
                      }
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

