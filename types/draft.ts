export interface Draft {
  id: string
  title: string
  description: string
  tags: string[]
  bpm: string
  key: string
  mp3File: File | null
  wavFile: File | null
  stemsFile: File | null
  coverArt: File | null
  licensing: Record<string, number>
  lastEdited: Date
}

export interface AudioFile {
  id: string
  title: string
  file: File | null
  wavFile: File | null
  stemsFile: File | null
  coverArt: File | null
  licensing?: Record<string, number>
  createdAt: Date
  updatedAt: Date
}

export interface PairedFile {
  id: string
  title: string
  type: 'audio' | 'cover' | 'contract' | 'stems'
  file: File | null
  createdAt: Date
  updatedAt: Date
}

export interface PlaylistAlbum {
  id: string
  title: string
  description: string
  coverArt: PairedFile | null
  tracks: PairedFile[]
  contract: PairedFile | null
  stems: PairedFile[]
  createdAt: Date
  updatedAt: Date
}

// Mock drafts data - in a real app, this would come from your backend
export const mockDrafts: Draft[] = [
  {
    id: "1",
    title: "Summer Vibes",
    description: "A chill beat perfect for summer days with tropical melodies and laid-back drums. Features a catchy hook and smooth transitions.",
    tags: ["chill", "summer", "vibes", "tropical", "melodic"],
    bpm: "120",
    key: "C",
    mp3File: null,
    wavFile: null,
    stemsFile: null,
    coverArt: null,
    licensing: {
      "Basic": 29.99,
      "Premium": 99.99,
      "Exclusive": 299.99
    },
    lastEdited: new Date("2024-04-01")
  },
  {
    id: "2",
    title: "Night Drive",
    description: "Synthwave inspired beat for late night drives. Features retro synths, deep bass, and atmospheric pads. Perfect for cinematic moments.",
    tags: ["synthwave", "night", "drive", "retro", "cinematic"],
    bpm: "128",
    key: "Am",
    mp3File: null,
    wavFile: null,
    stemsFile: null,
    coverArt: null,
    licensing: {
      "Basic": 24.99,
      "Premium": 89.99,
      "Exclusive": 249.99
    },
    lastEdited: new Date("2024-04-02")
  },
  {
    id: "3",
    title: "Urban Dreams",
    description: "Modern trap beat with hard-hitting 808s and atmospheric melodies. Features a unique vocal chop and dynamic arrangement.",
    tags: ["trap", "urban", "808", "melodic", "vocal"],
    bpm: "140",
    key: "F#m",
    mp3File: null,
    wavFile: null,
    stemsFile: null,
    coverArt: null,
    licensing: {
      "Basic": 34.99,
      "Premium": 119.99,
      "Exclusive": 349.99
    },
    lastEdited: new Date("2024-04-03")
  },
  {
    id: "4",
    title: "Jazz Fusion",
    description: "Experimental jazz fusion beat combining traditional jazz elements with modern production. Features live instruments and electronic textures.",
    tags: ["jazz", "fusion", "experimental", "live", "electronic"],
    bpm: "95",
    key: "Dm",
    mp3File: null,
    wavFile: null,
    stemsFile: null,
    coverArt: null,
    licensing: {
      "Basic": 39.99,
      "Premium": 129.99,
      "Exclusive": 399.99
    },
    lastEdited: new Date("2024-04-04")
  }
]

// Mock audio files data
export const mockAudioFiles: AudioFile[] = [
  {
    id: "af1",
    title: "Urban Dreams.wav",
    file: null,
    wavFile: new File([""], "Urban Dreams.wav", { type: "audio/wav" }),
    stemsFile: null,
    coverArt: null,
    createdAt: new Date("2024-03-15T10:00:00Z"),
    updatedAt: new Date("2024-03-15T10:00:00Z")
  },
  {
    id: "af2",
    title: "Jazz Fusion.mp3",
    file: new File([""], "Jazz Fusion.mp3", { type: "audio/mpeg" }),
    wavFile: null,
    stemsFile: null,
    coverArt: null,
    createdAt: new Date("2024-03-15T11:00:00Z"),
    updatedAt: new Date("2024-03-15T11:00:00Z")
  },
  {
    id: "af3",
    title: "Trap Beat Cover.jpg",
    file: null,
    wavFile: null,
    stemsFile: null,
    coverArt: new File([""], "Trap Beat Cover.jpg", { type: "image/jpeg" }),
    createdAt: new Date("2024-03-15T12:00:00Z"),
    updatedAt: new Date("2024-03-15T12:00:00Z")
  },
  {
    id: "af4",
    title: "Hip Hop Stems.zip",
    file: null,
    wavFile: null,
    stemsFile: new File([""], "Hip Hop Stems.zip", { type: "application/zip" }),
    coverArt: null,
    createdAt: new Date("2024-03-15T13:00:00Z"),
    updatedAt: new Date("2024-03-15T13:00:00Z")
  },
  {
    id: "af5",
    title: "R&B License.pdf",
    file: new File([""], "R&B License.pdf", { type: "application/pdf" }),
    wavFile: null,
    stemsFile: null,
    coverArt: null,
    createdAt: new Date("2024-03-15T14:00:00Z"),
    updatedAt: new Date("2024-03-15T14:00:00Z")
  },
  {
    id: "af6",
    title: "Electronic Dance.mp3",
    file: new File([""], "Electronic Dance.mp3", { type: "audio/mpeg" }),
    wavFile: null,
    stemsFile: null,
    coverArt: null,
    createdAt: new Date("2024-03-15T15:00:00Z"),
    updatedAt: new Date("2024-03-15T15:00:00Z")
  },
  {
    id: "af7",
    title: "Lo-Fi Chill.wav",
    file: null,
    wavFile: new File([""], "Lo-Fi Chill.wav", { type: "audio/wav" }),
    stemsFile: null,
    coverArt: null,
    createdAt: new Date("2024-03-15T16:00:00Z"),
    updatedAt: new Date("2024-03-15T16:00:00Z")
  },
  {
    id: "af8",
    title: "Rock Anthem.mp3",
    file: new File([""], "Rock Anthem.mp3", { type: "audio/mpeg" }),
    wavFile: null,
    stemsFile: null,
    coverArt: null,
    createdAt: new Date("2024-03-15T17:00:00Z"),
    updatedAt: new Date("2024-03-15T17:00:00Z")
  },
  {
    id: "af9",
    title: "Pop Melody.wav",
    file: null,
    wavFile: new File([""], "Pop Melody.wav", { type: "audio/wav" }),
    stemsFile: null,
    coverArt: null,
    createdAt: new Date("2024-03-15T18:00:00Z"),
    updatedAt: new Date("2024-03-15T18:00:00Z")
  },
  {
    id: "af10",
    title: "Classical Piece.mp3",
    file: new File([""], "Classical Piece.mp3", { type: "audio/mpeg" }),
    wavFile: null,
    stemsFile: null,
    coverArt: null,
    createdAt: new Date("2024-03-15T19:00:00Z"),
    updatedAt: new Date("2024-03-15T19:00:00Z")
  }
] 