"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Download, Music, CheckCircle2, XCircle, Clock } from "lucide-react"

// Mock data - replace with actual API calls
const mockRequests = [
  {
    id: "1",
    title: "Dark Trap Beat",
    artist: "Artist123",
    genre: "Trap",
    mood: "Aggressive",
    budget: "$200-$500",
    status: "open",
    deadline: "2024-04-15",
    submissions: [
      {
        id: "s1",
        producer: "Producer1",
        beatTitle: "Dark Night",
        price: "$300",
        status: "pending",
        audioUrl: "#",
      },
      {
        id: "s2",
        producer: "Producer2",
        beatTitle: "Midnight Trap",
        price: "$250",
        status: "pending",
        audioUrl: "#",
      },
    ],
  },
  {
    id: "2",
    title: "Chill R&B Beat",
    artist: "Artist456",
    genre: "R&B",
    mood: "Chill",
    budget: "$100-$200",
    status: "closed",
    deadline: "2024-03-30",
    submissions: [
      {
        id: "s3",
        producer: "Producer3",
        beatTitle: "Smooth Vibes",
        price: "$150",
        status: "approved",
        audioUrl: "#",
      },
    ],
  },
]

export default function BeatRequestsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("all")

  const handleApprove = (requestId: string, submissionId: string) => {
    // TODO: Implement approval logic
    toast({
      title: "Beat Approved",
      description: "The beat has been approved and the producer has been notified.",
    })
  }

  const handleReject = (requestId: string, submissionId: string) => {
    // TODO: Implement rejection logic
    toast({
      title: "Beat Rejected",
      description: "The beat has been rejected and the producer has been notified.",
    })
  }

  const handleSubmitBeat = (requestId: string) => {
    // TODO: Implement beat submission logic
    router.push(`/dashboard/beat-requests/${requestId}/submit`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 font-display tracking-wider text-primary">Beat Requests</h1>
          <p className="text-xl text-gray-400">View and manage beat requests</p>
        </div>
        {user?.role === "artist" && (
          <Button
            className="gradient-button text-black font-medium hover:text-white"
            onClick={() => router.push("/dashboard/artist/request-beat")}
          >
            Create New Request
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="open">Open Requests</TabsTrigger>
          <TabsTrigger value="submitted">My Submissions</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="space-y-6">
            {mockRequests.map((request) => (
              <Card key={request.id} className="bg-card border-primary">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl font-bold text-primary">{request.title}</CardTitle>
                      <CardDescription>
                        Requested by {request.artist} • {request.genre} • {request.mood} • Budget: {request.budget}
                      </CardDescription>
                    </div>
                    <Badge variant={request.status === "open" ? "default" : "secondary"}>
                      {request.status === "open" ? "Open" : "Closed"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>Deadline: {request.deadline}</span>
                      </div>
                      {user?.role === "producer" && request.status === "open" && (
                        <Button
                          className="gradient-button text-black font-medium hover:text-white"
                          onClick={() => handleSubmitBeat(request.id)}
                        >
                          Submit Beat
                        </Button>
                      )}
                    </div>

                    {request.submissions.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">Submissions</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producer</TableHead>
                              <TableHead>Beat Title</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {request.submissions.map((submission) => (
                              <TableRow key={submission.id}>
                                <TableCell>{submission.producer}</TableCell>
                                <TableCell>{submission.beatTitle}</TableCell>
                                <TableCell>{submission.price}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      submission.status === "approved"
                                        ? "success"
                                        : submission.status === "rejected"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {submission.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(submission.audioUrl, "_blank")}
                                    >
                                      <Music className="h-4 w-4 mr-2" />
                                      Listen
                                    </Button>
                                    {user?.role === "artist" && submission.status === "pending" && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleApprove(request.id, submission.id)}
                                        >
                                          <CheckCircle2 className="h-4 w-4 mr-2" />
                                          Approve
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleReject(request.id, submission.id)}
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Reject
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="open" className="mt-6">
          <div className="space-y-6">
            {mockRequests
              .filter((request) => request.status === "open")
              .map((request) => (
                <Card key={request.id} className="bg-card border-primary">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl font-bold text-primary">{request.title}</CardTitle>
                        <CardDescription>
                          Requested by {request.artist} • {request.genre} • {request.mood} • Budget: {request.budget}
                        </CardDescription>
                      </div>
                      <Badge variant="default">Open</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>Deadline: {request.deadline}</span>
                        </div>
                        {user?.role === "producer" && (
                          <Button
                            className="gradient-button text-black font-medium hover:text-white"
                            onClick={() => handleSubmitBeat(request.id)}
                          >
                            Submit Beat
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="submitted" className="mt-6">
          <div className="space-y-6">
            {mockRequests
              .filter((request) =>
                request.submissions.some((submission) => submission.producer === user?.email?.split("@")[0])
              )
              .map((request) => (
                <Card key={request.id} className="bg-card border-primary">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl font-bold text-primary">{request.title}</CardTitle>
                        <CardDescription>
                          Requested by {request.artist} • {request.genre} • {request.mood} • Budget: {request.budget}
                        </CardDescription>
                      </div>
                      <Badge variant={request.status === "open" ? "default" : "secondary"}>
                        {request.status === "open" ? "Open" : "Closed"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>Deadline: {request.deadline}</span>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Beat Title</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {request.submissions
                            .filter((submission) => submission.producer === user?.email?.split("@")[0])
                            .map((submission) => (
                              <TableRow key={submission.id}>
                                <TableCell>{submission.beatTitle}</TableCell>
                                <TableCell>{submission.price}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      submission.status === "approved"
                                        ? "success"
                                        : submission.status === "rejected"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {submission.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(submission.audioUrl, "_blank")}
                                  >
                                    <Music className="h-4 w-4 mr-2" />
                                    Listen
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <div className="space-y-6">
            {mockRequests
              .filter((request) =>
                request.submissions.some((submission) => submission.status === "approved")
              )
              .map((request) => (
                <Card key={request.id} className="bg-card border-primary">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl font-bold text-primary">{request.title}</CardTitle>
                        <CardDescription>
                          Requested by {request.artist} • {request.genre} • {request.mood} • Budget: {request.budget}
                        </CardDescription>
                      </div>
                      <Badge variant="success">Approved</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producer</TableHead>
                            <TableHead>Beat Title</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {request.submissions
                            .filter((submission) => submission.status === "approved")
                            .map((submission) => (
                              <TableRow key={submission.id}>
                                <TableCell>{submission.producer}</TableCell>
                                <TableCell>{submission.beatTitle}</TableCell>
                                <TableCell>{submission.price}</TableCell>
                                <TableCell>
                                  <Badge variant="success">Approved</Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(submission.audioUrl, "_blank")}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 