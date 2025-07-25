import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, TrendingUp, Vote } from "lucide-react"
import { CreateDeviceForm } from "@/components/create-device-form"
import { StarRating } from "@/components/star-rating"

import { createClient } from 'gel'

type Device = {
  id: string
  name: string
  votes: Vote[]
}

type Vote = {
  id: string
  value: number
  created_at: string
  device: Device
}

const client = createClient({
  instance: process.env.GEL_INSTANCE,
  branch: process.env.GEL_BRANCH,
  secretKey: process.env.GEL_SECRET_KEY,
})

async function getDevicesStats(): Promise<Device[]> {
  try {
    const result = await client.query(`
      select Device {
        id,
        name,
        votes: {
          id,
          value,
          created_at,
          device: { id, name }
        }
      };
    `)
    
    return (result as Device[]) || []
  } catch (error) {
    console.error('Failed to fetch devices:', error)
    return []
  }
}

// Disable caching for this page
export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const devicesStats = await getDevicesStats()

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tableau de bord des votes</h1>
            <p className="text-muted-foreground">Surveillez l'activité de vote sur tous les appareils</p>
          </div>
          <CreateDeviceForm />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {devicesStats.map((device: Device) => {
          const totalVotes = device.votes.length;
          const averageVote = totalVotes > 0 
            ? Math.round((device.votes.reduce((sum: number, vote: Vote) => sum + vote.value, 0) / totalVotes) * 100) / 100
            : 0;
          
          return (
            <Link key={device.id} href={`/device/${device.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    <Badge variant="secondary">
                      <Vote className="w-3 h-3 mr-1" />
                      {totalVotes}
                    </Badge>
                  </div>
                  <CardDescription>Cliquez pour voir les statistiques détaillées</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl font-bold">{averageVote}</span>
                        <span className="text-sm text-muted-foreground">/ 5</span>
                      </div>
                      <StarRating rating={averageVote} size="sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {devicesStats.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Vote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun vote pour le moment</h3>
              <p className="text-muted-foreground">Commencez à collecter des votes pour voir les statistiques des appareils ici.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
