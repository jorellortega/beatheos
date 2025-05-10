"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const mockCollaborations = [
  { id: 1, title: "Hip Hop Collab", description: "Looking for a rapper to collaborate on a new track." },
  { id: 2, title: "Jazz Fusion Project", description: "Seeking a saxophonist for a jazz fusion project." },
  { id: 3, title: "Electronic Remix", description: "Need a producer to remix an electronic track." },
];

export default function FeaturesPage() {
  const [collabTitle, setCollabTitle] = useState("");
  const [description, setDescription] = useState("");

  const handlePostCollab = () => {
    // Logic to post the collaboration details
    console.log("Collaboration Posted:", { collabTitle, description });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Artist Collaborations</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-primary hover:border-primary transition-all">
          <CardHeader>
            <CardTitle>Post a Collaboration</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Collaboration Title"
              value={collabTitle}
              onChange={(e) => setCollabTitle(e.target.value)}
              className="mb-4"
            />
            <Textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mb-4"
            />
            <Button onClick={handlePostCollab} className="w-full gradient-button text-black font-medium hover:text-white">
              Post Collaboration
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {mockCollaborations.map((collab) => (
          <Card key={collab.id} className="bg-card border-primary hover:border-primary transition-all">
            <CardHeader>
              <CardTitle>{collab.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mt-2">{collab.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 