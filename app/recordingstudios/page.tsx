"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const mockStudios = [
  { id: 1, name: "Sunset Sound Studio", location: "Los Angeles, CA", description: "A legendary studio with state-of-the-art equipment." },
  { id: 2, name: "Abbey Road Studios", location: "London, UK", description: "Iconic studio known for its rich history and top-notch acoustics." },
  { id: 3, name: "Electric Lady Studios", location: "New York, NY", description: "Famous for its unique vibe and cutting-edge technology." },
];

export default function RecordingStudiosPage() {
  const [studioName, setStudioName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const handlePostStudio = () => {
    // Logic to post the studio details
    console.log("Studio Posted:", { studioName, location, description });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Recording Studios</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Post Your Studio</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Studio Name"
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              className="mb-4"
            />
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mb-4"
            />
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mb-4"
            />
            <Button onClick={handlePostStudio} className="w-full gradient-button text-black font-medium hover:text-white">
              Post Studio
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockStudios.map((studio) => (
          <Card key={studio.id} className="bg-card border-primary hover:border-primary transition-all">
            <CardHeader>
              <CardTitle>{studio.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-32 bg-gray-200 mb-4 flex items-center justify-center">
                <span className="text-gray-500">Image Placeholder</span>
              </div>
              <p className="text-sm text-gray-400">Location: {studio.location}</p>
              <p className="mt-2">{studio.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 