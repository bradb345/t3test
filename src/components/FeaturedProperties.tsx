import { Card } from "~/components/ui/card"
import { Button } from "~/components/ui/button"

export function FeaturedProperties() {
  return (
    <div className="w-full">
      <h2 className="mb-8 text-center text-3xl font-bold">Featured Properties</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-video bg-muted" />
            <div className="p-4">
              <h3 className="font-semibold">Featured Property {i}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Beautiful property with amazing amenities
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-semibold">$1,200/mo</span>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
} 